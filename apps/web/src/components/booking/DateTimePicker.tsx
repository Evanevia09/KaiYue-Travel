import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookingIcon } from "./BookingIcons.tsx";
import {
  HOURS_24,
  MINUTE_OPTIONS,
  WEEKDAYS,
  WHEEL_BLANK_LABEL,
  addMonths,
  applyTime,
  blankTimeDraft,
  combineDateAndTime,
  displayLocale,
  formatCompactDateTime,
  formatFieldDateTime,
  formatFooterDate,
  formatMonthTitle,
  formatTimeOrPlaceholder,
  isBeforeDay,
  isPastDay,
  isSameDay,
  isTimeDraftComplete,
  monthGrid,
  nextWheelValue,
  parseLocalDateTime,
  splitTime,
  startOfMonth,
  wheelWindow,
  type TimeDraft,
} from "./datetime.ts";

type Leg = "pickup" | "return";

type Props = {
  pickupAt: string;
  returnAt: string;
  pickupError?: string;
  returnError?: string;
  allowReturn?: boolean;
  onPickupChange: (value: string) => void;
  onReturnChange: (value: string) => void;
};

function TimeWheel<T extends number>({
  label,
  values,
  value,
  format,
  onChange,
}: {
  label: string;
  values: readonly T[];
  value: T | undefined;
  format: (item: T) => string;
  onChange: (value: T) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;
  const windowItems = wheelWindow(values, value);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) {
      return;
    }
    let startY = 0;
    let moved = false;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const delta = event.deltaY === 0 ? 0 : event.deltaY > 0 ? 1 : -1;
      if (delta !== 0) {
        onChangeRef.current(nextWheelValue(values, valueRef.current, delta));
      }
    };
    const onTouchStart = (event: TouchEvent) => {
      startY = event.touches[0]?.clientY ?? 0;
      moved = false;
    };
    const onTouchMove = (event: TouchEvent) => {
      event.preventDefault();
      event.stopPropagation();
      moved = true;
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (!moved) {
        return;
      }
      const endY = event.changedTouches[0]?.clientY ?? startY;
      const deltaY = startY - endY;
      if (Math.abs(deltaY) < 12) {
        return;
      }
      onChangeRef.current(nextWheelValue(values, valueRef.current, deltaY > 0 ? 1 : -1));
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch" || event.pointerType === "pen") {
        el.setPointerCapture(event.pointerId);
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("pointerdown", onPointerDown);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("pointerdown", onPointerDown);
    };
  }, [values]);

  return (
    <div className="dtp-wheel" role="listbox" aria-label={label} ref={rootRef}>
      <button
        type="button"
        className="dtp-wheel__nav"
        aria-label={`Earlier ${label}`}
        onClick={() => onChange(nextWheelValue(values, value, -1))}
      >
        <BookingIcon name="chevronUp" size={16} />
      </button>
      {windowItems.map((item, index) => {
        const selected = index === 2;
        const blank = item === undefined;
        return (
          <button
            key={`${item ?? "blank"}-${index}`}
            type="button"
            role="option"
            className={
              selected
                ? blank
                  ? "dtp-wheel__value is-selected is-placeholder"
                  : "dtp-wheel__value is-selected"
                : "dtp-wheel__value"
            }
            aria-current={selected ? "true" : undefined}
            aria-selected={selected}
            disabled={blank}
            onClick={() => {
              if (item !== undefined) {
                onChange(item);
              }
            }}
          >
            {blank ? WHEEL_BLANK_LABEL : format(item)}
          </button>
        );
      })}
      <button
        type="button"
        className="dtp-wheel__nav"
        aria-label={`Later ${label}`}
        onClick={() => onChange(nextWheelValue(values, value, 1))}
      >
        <BookingIcon name="chevronDown" size={16} />
      </button>
    </div>
  );
}

function TimePanel({
  title,
  draft,
  onDraft,
  onSave,
  onBack,
  onClose,
  canSave,
}: {
  title: string;
  draft: TimeDraft;
  onDraft: (draft: TimeDraft) => void;
  onSave: () => void;
  onBack: () => void;
  onClose: () => void;
  canSave: boolean;
}) {
  return (
    <div className="dtp-time" role="group" aria-label={title}>
      <div className="dtp-time__header">
        <button
          type="button"
          className="dtp-time__back"
          onClick={onBack}
          aria-label="Back to calendar"
        >
          <BookingIcon name="chevronLeft" size={18} />
        </button>
        <span className="dtp-time__mobile-title">{title}</span>
        <button
          type="button"
          className="dtp-time__close"
          onClick={onClose}
          aria-label="Close time picker"
        >
          <BookingIcon name="close" size={20} />
        </button>
      </div>
      <p className="dtp-time__title">{title}</p>
      <div className="dtp-time__wheels">
        <TimeWheel
          label="Hour"
          values={HOURS_24}
          value={draft.hours24}
          format={(item) => String(item).padStart(2, "0")}
          onChange={(hours24) =>
            onDraft({
              ...draft,
              hours24,
              hours12: hours24 % 12 || 12,
              period: hours24 >= 12 ? "PM" : "AM",
            })
          }
        />
        <TimeWheel
          label="Minute"
          values={MINUTE_OPTIONS}
          value={draft.minutes}
          format={(item) => String(item).padStart(2, "0")}
          onChange={(minutes) => onDraft({ ...draft, minutes })}
        />
      </div>
      <button
        type="button"
        className="btn btn--primary btn--block dtp-time__save"
        onClick={onSave}
        disabled={!canSave}
      >
        Save
      </button>
    </div>
  );
}

function MonthGrid({
  month,
  pickupAt,
  returnAt,
  activeLeg,
  onSelect,
}: {
  month: Date;
  pickupAt: string;
  returnAt: string;
  activeLeg: Leg;
  onSelect: (day: Date) => void;
}) {
  const pickup = parseLocalDateTime(pickupAt);
  const returning = parseLocalDateTime(returnAt);
  const cells = useMemo(() => monthGrid(month.getFullYear(), month.getMonth()), [month]);
  const locale = displayLocale();
  const weekdays =
    locale === "en-US"
      ? WEEKDAYS
      : Array.from({ length: 7 }, (_, index) =>
          new Date(2024, 0, index + 1).toLocaleDateString(locale, { weekday: "short" }),
        );
  return (
    <div className="dtp-month">
      <p className="dtp-month__title">{formatMonthTitle(month)}</p>
      <div className="dtp-month__weekdays">
        {weekdays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="dtp-month__grid">
        {cells.map((day, index) => {
          if (!day) {
            return <span key={`empty-${index}`} className="dtp-day dtp-day--empty" />;
          }
          const isPickup = Boolean(pickup && isSameDay(day, pickup));
          const isReturn = Boolean(returning && isSameDay(day, returning));
          const selected = isPickup || isReturn;
          const disabled =
            isPastDay(day) ||
            (activeLeg === "return" && pickup !== null && isBeforeDay(day, pickup));
          return (
            <button
              key={day.toISOString()}
              type="button"
              className={[
                "dtp-day",
                selected ? "is-selected" : "",
                isPickup && !(isReturn && activeLeg === "return") ? "is-pickup" : "",
                isReturn ? "is-return" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={disabled}
              aria-pressed={selected ? true : undefined}
              aria-label={day.toLocaleDateString(locale, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              onClick={() => onSelect(day)}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FooterLeg({
  legend,
  value,
  active,
  timeOpen,
  timeSelected,
  onActivate,
  onTime,
}: {
  legend: string;
  value: string;
  active: boolean;
  timeOpen: boolean;
  timeSelected: boolean;
  onActivate: () => void;
  onTime: () => void;
}) {
  const date = parseLocalDateTime(value);
  return (
    <div
      className={`dtp-leg dtp-leg--${legend.startsWith("Pickup") ? "pickup" : "return"}${active ? " is-active" : ""}`}
    >
      <button type="button" className="dtp-leg__date" onClick={onActivate}>
        <span className="dtp-leg__dot" aria-hidden="true" />
        <span>
          <span className="dtp-leg__label">{legend}</span>
          <span className="dtp-leg__value">
            {value ? formatFooterDate(value) : "Select a date"}
          </span>
        </span>
      </button>
      <div className="dtp-leg__time">
        <span className="dtp-leg__label">{legend.replace(" date", " time")}</span>
        <button
          type="button"
          className={
            timeOpen
              ? "dtp-time-toggle is-open"
              : timeSelected
                ? "dtp-time-toggle"
                : "dtp-time-toggle is-placeholder"
          }
          disabled={!value}
          aria-expanded={timeOpen}
          aria-haspopup="dialog"
          onClick={onTime}
        >
          {formatTimeOrPlaceholder(date, timeSelected)}
          <BookingIcon name="chevronDown" size={14} />
        </button>
      </div>
    </div>
  );
}

export function DateTimePicker({
  pickupAt,
  returnAt,
  pickupError,
  returnError,
  allowReturn = true,
  onPickupChange,
  onReturnChange,
}: Props) {
  const dialogId = useId();
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [returnEnabled, setReturnEnabled] = useState(Boolean(returnAt));
  const [activeLeg, setActiveLeg] = useState<Leg>("pickup");
  const [timeTarget, setTimeTarget] = useState<Leg | null>(null);
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(parseLocalDateTime(pickupAt) ?? new Date()),
  );
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 0 });
  const [placed, setPlaced] = useState(false);
  const [timeDraft, setTimeDraft] = useState<TimeDraft>(() => splitTime(pickupAt));
  const [pendingPickupAt, setPendingPickupAt] = useState(pickupAt);
  const [pendingReturnAt, setPendingReturnAt] = useState(returnAt);
  const [pickupTimeSelected, setPickupTimeSelected] = useState(Boolean(pickupAt));
  const [returnTimeSelected, setReturnTimeSelected] = useState(Boolean(returnAt));
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 879px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!allowReturn) {
      setReturnEnabled(false);
      return;
    }
    if (returnAt) {
      setReturnEnabled(true);
    }
  }, [allowReturn, returnAt]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.classList.add("dtp-open");
    document.body.style.overflow = "hidden";
    return () => {
      document.body.classList.remove("dtp-open");
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function placePopover() {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const gutter = 12;
    const twoMonths = allowReturn && returnEnabled;
    const calendarWidth = twoMonths ? 640 : 340;
    const estimatedWidth = Math.min(
      timeTarget ? calendarWidth + 180 : calendarWidth,
      window.innerWidth - gutter * 2,
    );
    const estimatedHeight = timeTarget ? 520 : 430;
    const left = Math.max(gutter, Math.min(rect.left, window.innerWidth - estimatedWidth - gutter));
    let top = rect.bottom + 8;
    if (top + estimatedHeight > window.innerHeight - gutter) {
      top = Math.max(gutter, window.innerHeight - estimatedHeight - gutter);
    }
    setPos({ top, left, width: estimatedWidth, maxHeight: window.innerHeight - gutter * 2 });
    setPlaced(true);
  }

  useLayoutEffect(() => {
    if (!open) {
      setPlaced(false);
      return;
    }
    placePopover();
  }, [open, timeTarget, returnEnabled, pickupAt, returnAt]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
      setTimeTarget(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      if (timeTarget) {
        setTimeTarget(null);
        return;
      }
      setOpen(false);
    }
    function onReposition() {
      placePopover();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, timeTarget]);

  function openPicker(leg: Leg) {
    const source = parseLocalDateTime(leg === "return" && returnAt ? returnAt : pickupAt);
    setViewMonth(startOfMonth(source ?? new Date()));
    setActiveLeg(leg === "return" && !pickupAt ? "pickup" : leg);
    setTimeTarget(null);
    setPendingPickupAt(pickupAt);
    setPendingReturnAt(returnAt);
    setPickupTimeSelected(Boolean(pickupAt));
    setReturnTimeSelected(Boolean(returnAt));
    setOpen(true);
  }

  function togglePicker(leg: Leg) {
    if (open && activeLeg === leg && !timeTarget) {
      setOpen(false);
      return;
    }
    openPicker(leg);
  }

  function selectDay(day: Date) {
    const pickup = parseLocalDateTime(pendingPickupAt || pickupAt);
    if (!returnEnabled || activeLeg === "pickup" || !pickup) {
      const nextPickup = combineDateAndTime(day);
      setPendingPickupAt(nextPickup);
      setPickupTimeSelected(false);
      onPickupChange("");
      const currentReturn = parseLocalDateTime(returnAt);
      const nextPickupDate = parseLocalDateTime(nextPickup);
      if (currentReturn && nextPickupDate && currentReturn.getTime() <= nextPickupDate.getTime()) {
        onReturnChange("");
        setPendingReturnAt("");
        setReturnTimeSelected(false);
      }
      setActiveLeg("pickup");
      setTimeDraft(blankTimeDraft());
      setTimeTarget("pickup");
      return;
    }
    if (isBeforeDay(day, pickup)) {
      return;
    }
    setPendingReturnAt(combineDateAndTime(day));
    setReturnTimeSelected(false);
    onReturnChange("");
    setActiveLeg("return");
    setTimeDraft(blankTimeDraft());
    setTimeTarget("return");
  }

  function openTime(leg: Leg) {
    const source = leg === "return" ? pendingReturnAt || returnAt : pendingPickupAt || pickupAt;
    if (!source) {
      return;
    }
    const selected = leg === "return" ? returnTimeSelected : pickupTimeSelected;
    setTimeDraft(selected ? splitTime(source) : blankTimeDraft());
    setTimeTarget((current) => (current === leg ? null : leg));
    setActiveLeg(leg);
  }

  function saveTime() {
    if (!timeTarget || !isTimeDraftComplete(timeDraft)) {
      return;
    }
    const source = timeTarget === "return" ? pendingReturnAt : pendingPickupAt;
    if (!source) {
      return;
    }
    const next = applyTime(source, timeDraft.hours24, timeDraft.minutes);
    if (timeTarget === "return") {
      onReturnChange(next);
      setPendingReturnAt(next);
      setReturnTimeSelected(true);
    } else {
      onPickupChange(next);
      setPendingPickupAt(next);
      setPickupTimeSelected(true);
    }
    setTimeTarget(null);
    if (timeTarget === "pickup" && returnEnabled && !mobile) {
      setActiveLeg("return");
      setViewMonth(
        startOfMonth(parseLocalDateTime(pendingReturnAt) ?? parseLocalDateTime(next) ?? new Date()),
      );
    }
  }

  function enableReturn() {
    if (!allowReturn) {
      return;
    }
    setReturnEnabled(true);
    openPicker(pickupAt ? "return" : "pickup");
  }

  function clearReturn(event: { stopPropagation: () => void }) {
    event.stopPropagation();
    setReturnEnabled(false);
    onReturnChange("");
    setPendingReturnAt("");
    setReturnTimeSelected(false);
    setActiveLeg("pickup");
    if (timeTarget === "return") {
      setTimeTarget(null);
    }
  }

  const canPrev = viewMonth > startOfMonth(new Date());
  const error = pickupError || returnError;
  const roundtrip = allowReturn && Boolean(returnAt);
  const twoMonths = allowReturn && returnEnabled;
  const returnAfterPickup =
    !returnAt ||
    !pickupAt ||
    (parseLocalDateTime(returnAt)?.getTime() ?? 0) > (parseLocalDateTime(pickupAt)?.getTime() ?? 0);
  const canConfirm =
    Boolean(pickupAt) &&
    pickupTimeSelected &&
    returnAfterPickup &&
    (mobile
      ? activeLeg === "pickup" || (Boolean(returnAt) && returnTimeSelected)
      : !returnEnabled || (Boolean(returnAt) && returnTimeSelected));

  return (
    <div className={roundtrip ? "dtp dtp--roundtrip" : "dtp"} ref={triggerRef}>
      {roundtrip ? (
        <div
          className={
            open
              ? "dtp-trigger dtp-trigger--roundtrip is-open"
              : "dtp-trigger dtp-trigger--roundtrip"
          }
        >
          <button
            type="button"
            className="dtp-trigger__leg"
            aria-expanded={open && activeLeg === "pickup"}
            aria-controls={dialogId}
            aria-invalid={pickupError ? true : undefined}
            onClick={() => togglePicker("pickup")}
          >
            <span className="booking-bar__icon">
              <BookingIcon name="calendar" size={16} />
            </span>
            <span>
              <span className="booking-bar__label">Pickup date</span>
              <span
                className={pickupAt ? "dtp-trigger__value" : "dtp-trigger__value is-placeholder"}
              >
                {pickupAt ? formatCompactDateTime(pickupAt) : "Select date"}
              </span>
            </span>
          </button>
          <span className="dtp-trigger__arrow" aria-hidden="true">
            <BookingIcon name="arrow" size={14} />
          </span>
          <button
            type="button"
            className="dtp-trigger__leg"
            aria-expanded={open && activeLeg === "return"}
            aria-controls={dialogId}
            aria-invalid={returnError ? true : undefined}
            onClick={() => togglePicker("return")}
          >
            <span>
              <span className="booking-bar__label">Return date</span>
              <span
                className={returnAt ? "dtp-trigger__value" : "dtp-trigger__value is-placeholder"}
              >
                {returnAt ? formatCompactDateTime(returnAt) : "Select date"}
              </span>
            </span>
          </button>
          <button
            type="button"
            className="dtp-clear"
            aria-label="Remove return"
            onClick={clearReturn}
          >
            <BookingIcon name="close" size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={open ? "dtp-trigger is-open" : "dtp-trigger"}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={dialogId}
          aria-invalid={pickupError ? true : undefined}
          onClick={() => togglePicker("pickup")}
        >
          <span className="booking-bar__icon">
            <BookingIcon name="calendar" size={16} />
          </span>
          <span>
            <span className="booking-bar__label">Pickup date</span>
            <span className={pickupAt ? "dtp-trigger__value" : "dtp-trigger__value is-placeholder"}>
              {pickupAt ? formatFieldDateTime(pickupAt) : "Select date & time"}
            </span>
          </span>
        </button>
      )}
      {roundtrip || !allowReturn ? null : (
        <button type="button" className="booking-bar__add-return" onClick={enableReturn}>
          <span className="booking-bar__icon">
            <BookingIcon name="plus" size={16} />
          </span>
          Add return
        </button>
      )}
      {error ? <p className="field-error dtp-error">{error}</p> : null}
      {open && placed && typeof document !== "undefined"
        ? createPortal(
            <>
              <div
                className="dtp-backdrop"
                aria-hidden="true"
                onClick={() => {
                  setOpen(false);
                  setTimeTarget(null);
                }}
              />
              <div
                ref={popoverRef}
                id={dialogId}
                className={[
                  "dtp-popover",
                  timeTarget ? "dtp-popover--time" : "",
                  twoMonths ? "" : "dtp-popover--single",
                ]
                  .filter(Boolean)
                  .join(" ")}
                role="dialog"
                aria-label="Choose date and time"
                style={{
                  top: pos.top,
                  left: pos.left,
                  width: pos.width,
                  maxHeight: pos.maxHeight,
                }}
              >
                <div className="dtp-popover__calendar">
                  <div className="dtp-mobile-heading">
                    <div>
                      <p className="dtp-mobile-heading__eyebrow">Your journey</p>
                      <h3>{activeLeg === "return" ? "Return Date" : "Pickup Date"}</h3>
                    </div>
                    <button
                      type="button"
                      className="dtp-mobile-heading__close"
                      aria-label="Close calendar"
                      onClick={() => {
                        setOpen(false);
                        setTimeTarget(null);
                      }}
                    >
                      <BookingIcon name="close" size={20} />
                    </button>
                  </div>
                  <div className="dtp-nav">
                    <button
                      type="button"
                      className="dtp-nav__btn"
                      aria-label="Previous month"
                      disabled={!canPrev}
                      onClick={() => setViewMonth(addMonths(viewMonth, -1))}
                    >
                      <BookingIcon name="chevronLeft" size={18} />
                    </button>
                    <button
                      type="button"
                      className="dtp-nav__btn"
                      aria-label="Next month"
                      onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                    >
                      <BookingIcon name="chevronRight" size={18} />
                    </button>
                  </div>
                  <div className={twoMonths ? "dtp-months" : "dtp-months dtp-months--single"}>
                    <MonthGrid
                      month={viewMonth}
                      pickupAt={pendingPickupAt}
                      returnAt={pendingReturnAt}
                      activeLeg={activeLeg}
                      onSelect={selectDay}
                    />
                    {twoMonths ? (
                      <MonthGrid
                        month={addMonths(viewMonth, 1)}
                        pickupAt={pendingPickupAt}
                        returnAt={pendingReturnAt}
                        activeLeg={activeLeg}
                        onSelect={selectDay}
                      />
                    ) : null}
                  </div>
                  <div className="dtp-footer">
                    <FooterLeg
                      legend="Pickup date"
                      value={pendingPickupAt}
                      active={activeLeg === "pickup"}
                      timeOpen={timeTarget === "pickup"}
                      timeSelected={pickupTimeSelected}
                      onActivate={() => setActiveLeg("pickup")}
                      onTime={() => openTime("pickup")}
                    />
                    {allowReturn && returnEnabled ? (
                      <FooterLeg
                        legend="Return date"
                        value={pendingReturnAt}
                        active={activeLeg === "return"}
                        timeOpen={timeTarget === "return"}
                        timeSelected={returnTimeSelected}
                        onActivate={() => setActiveLeg("return")}
                        onTime={() => openTime("return")}
                      />
                    ) : null}
                    <button
                      type="button"
                      className="btn btn--primary btn--block dtp-confirm"
                      disabled={!canConfirm}
                      onClick={() => {
                        setOpen(false);
                        setTimeTarget(null);
                      }}
                    >
                      Confirm
                    </button>
                    {!returnAfterPickup ? (
                      <p className="field-error" role="status">
                        Return must be later than pickup.
                      </p>
                    ) : null}
                  </div>
                </div>
                {timeTarget ? (
                  <TimePanel
                    title={timeTarget === "return" ? "Return Time" : "Pickup Time"}
                    draft={timeDraft}
                    onDraft={setTimeDraft}
                    onSave={saveTime}
                    onBack={() => setTimeTarget(null)}
                    onClose={() => {
                      setTimeTarget(null);
                      setOpen(false);
                    }}
                    canSave={isTimeDraftComplete(timeDraft)}
                  />
                ) : null}
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
