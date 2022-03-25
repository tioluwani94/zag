import { dataAttr, EventKeyMap, getEventStep, getNativeEvent, nextTick } from "@ui-machines/dom-utils"
import { multiply, roundToPx } from "@ui-machines/number-utils"
import { getEventPoint } from "@ui-machines/rect-utils"
import { normalizeProp, PropTypes, ReactPropTypes } from "@ui-machines/types"
import { dom } from "./number-input.dom"
import { Send, State } from "./number-input.types"
import { utils } from "./number-input.utils"

export function connect<T extends PropTypes = ReactPropTypes>(state: State, send: Send, normalize = normalizeProp) {
  const isScrubbing = state.matches("scrubbing")
  const isFocused = state.hasTag("focus")
  const isInvalid = state.context.isOutOfRange || Boolean(state.context.invalid)

  const isDisabled = state.context.disabled
  const isIncrementDisabled = isDisabled || !state.context.canIncrement
  const isDecrementDisabled = isDisabled || !state.context.canDecrement

  return {
    valueAsNumber: state.context.valueAsNumber,
    value: state.context.formattedValue,
    isScrubbing,
    isFocused,
    isDisabled,
    isInvalid,
    setValue(value: string | number) {
      send({ type: "SET_VALUE", value: value.toString() })
    },
    clear() {
      send("CLEAR_VALUE")
    },
    increment() {
      send("INCREMENT")
    },
    decrement() {
      send("DECREMENT")
    },
    setToMax() {
      send("SET_TO_MAX")
    },
    setToMin() {
      send("SET_TO_MIN")
    },
    focus() {
      nextTick(() => {
        dom.getInputEl(state.context)?.focus()
      })
    },

    rootProps: normalize.element<T>({
      id: dom.getRootId(state.context),
      "data-part": "root",
    }),

    labelProps: normalize.label<T>({
      "data-part": "label",
      "data-disabled": dataAttr(isDisabled),
      "data-readonly": dataAttr(state.context.readonly),
      "data-invalid": dataAttr(isInvalid),
      id: dom.getLabelId(state.context),
      htmlFor: dom.getInputId(state.context),
    }),

    inputProps: normalize.input<T>({
      "data-part": "input",
      name: state.context.name,
      id: dom.getInputId(state.context),
      role: "spinbutton",
      pattern: state.context.pattern,
      inputMode: state.context.inputMode,
      disabled: isDisabled,
      readOnly: state.context.readonly,
      autoComplete: "off",
      autoCorrect: "off",
      type: "text",
      "aria-valuemin": state.context.min,
      "aria-valuemax": state.context.max,
      "aria-valuetext": state.context.ariaValueText || undefined,
      "aria-valuenow": isNaN(state.context.valueAsNumber) ? undefined : state.context.valueAsNumber,
      "aria-invalid": isInvalid || undefined,
      "data-invalid": dataAttr(isInvalid),
      "data-disabled": dataAttr(isDisabled),
      "aria-readonly": state.context.readonly || undefined,
      value: state.context.value,
      onFocus() {
        send("FOCUS")
      },
      onBlur() {
        send("BLUR")
      },
      onChange(event) {
        const evt = getNativeEvent(event)
        if (evt.isComposing) return
        send({ type: "CHANGE", target: event.currentTarget, hint: "set" })
      },
      onKeyDown(event) {
        const evt = getNativeEvent(event)
        if (evt.isComposing) return
        if (!utils.isValidNumericEvent(state.context, event)) {
          event.preventDefault()
        }

        const step = multiply(getEventStep(event), state.context.step)
        const keyMap: EventKeyMap = {
          ArrowUp() {
            send({ type: "ARROW_UP", step })
          },
          ArrowDown() {
            send({ type: "ARROW_DOWN", step })
          },
          Home() {
            send("HOME")
          },
          End() {
            send("END")
          },
        }

        const exec = keyMap[event.key]

        if (exec) {
          exec(event)
          event.preventDefault()
        }
      },
    }),

    decrementButtonProps: normalize.button<T>({
      "data-part": "spinner-button",
      id: dom.getDecButtonId(state.context),
      disabled: isDecrementDisabled,
      "data-disabled": dataAttr(isDecrementDisabled),
      "aria-label": "Decrement value",
      role: "button",
      tabIndex: -1,
      onPointerDown(event) {
        if (isDecrementDisabled) return
        send({ type: "PRESS_DOWN", hint: "decrement" })
        event.preventDefault()
      },
      onPointerUp() {
        send({ type: "PRESS_UP", hint: "decrement" })
      },
      onPointerLeave() {
        if (isDecrementDisabled) return
        send({ type: "PRESS_UP", hint: "decrement" })
      },
    }),

    incrementButtonProps: normalize.button<T>({
      "data-part": "spinner-button",
      id: dom.getIncButtonId(state.context),
      disabled: isIncrementDisabled,
      "data-disabled": dataAttr(isIncrementDisabled),
      "aria-label": "Increment value",
      role: "button",
      tabIndex: -1,
      onPointerDown(event) {
        event.preventDefault()
        if (isIncrementDisabled) return
        send({ type: "PRESS_DOWN", hint: "increment" })
      },
      onPointerUp() {
        send({ type: "PRESS_UP", hint: "increment" })
      },
      onPointerLeave() {
        send({ type: "PRESS_UP", hint: "increment" })
      },
    }),

    scrubberProps: normalize.element<T>({
      "data-disabled": dataAttr(isDisabled),
      "data-part": "scrubber",
      id: dom.getScrubberId(state.context),
      role: "presentation",
      onMouseDown(event) {
        if (isDisabled) return
        const evt = getNativeEvent(event)
        event.preventDefault()
        const point = getEventPoint(evt)

        point.x = point.x - roundToPx(7.5)
        point.y = point.y - roundToPx(7.5)

        send({ type: "PRESS_DOWN_SCRUBBER", point })
      },
      style: {
        cursor: "ew-resize",
      },
    }),
  }
}
