import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { BookingIcon } from "./BookingIcons.tsx";
import {
  HOURS_12,
  HOURS_24,
  MINUTE_OPTIONS,
  WEEKDAYS,
  addMonths,
  applyTime,
  combineDateAndTime,
  formatCompactDateTime,
  formatFieldDateTime,
  formatFooterDate,
  formatMonthTitle,
  formatTime24,
  isBeforeDay,
  isPastDay,
  isSameDay,
  monthGrid,
  parseLocalDateTime,
  splitTime,
  startOfMonth,
  toHours24,
  type DayPeriod,
  type HourCycle,
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

type TimeDraft = {
  hours12: number;
  hours24: number;
  minutes: number;
  period: DayPeriod;
};

function nextWheelValue<T>(values: readonly T[], current: T, delta: number): T {
  const index = values.indexOf(current);
  const from = index === -1 ? 0 : index;
  return values[(from + delta + values.length) % values.length] as T;
}

function TimeWheel<T extends number>({
  label,
  values,
  value,
  format,
  onChange,
}: {
  label: string;
  values: readonly T[];
  value: T;
  format: (item: T) => string;
  onChange: (value: T) => void;
}) {
  const window = [-2, -1, 0, 1, 2].map((offset) => nextWheelValue(values, value, offset));
  return (
    <div className="dtp-wheel" role="group" aria-label={label}>
      <button
        type="button"
        className="dtp-wheel__nav"
        aria-label={`Earlier ${label}`}
        onClick={() => onChange(nextWheelValue(values, value, -1))}
      >
        <BookingIcon name="chevronUp" size={16} />
      </button>
      {window.map((item, index) => (
        <button
          key={`${item}-${index}`}
          type="button"
          className={index === 2 ? "dtp-wheel__value is-selected" : "dtp-wheel__value"}
          aria-current={index === 2 ? "true" : undefined}
          onClick={() => onChange(item)}
        >
          {format(item)}
        </button>
      ))}
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
  hourCycle,
  draft,
  onHourCycle,
  onDraft,
  onSave,
}: {
  title: string;
  hourCycle: HourCycle;
  draft: TimeDraft;
  onHourCycle: (cycle: HourCycle) => void;
  onDraft: (draft: TimeDraft) => void;
  onSave: () => void;
}) {
  return (
    <div className="dtp-time" role="group" aria-label={title}>
      <p className="dtp-time__title">{title}</p>
      <div className="dtp-time__cycle" role="group" aria-label="Hour format">
        <button
          type="button"
          aria-pressed={hourCycle === "24"}
          onClick={() => {
            onHourCycle("24");
            onDraft({
              ...draft,
              hours24: toHours24(draft.hours12, draft.period),
            });
          }}
        >
          24h
        </button>
        <button
          type="button"
          aria-pressed={hourCycle === "12"}
          onClick={() => {
            onHourCycle("12");
            const hours24 = draft.hours24;
            onDraft({
              ...draft,
              hours12: hours24 % 12 || 12,
              period: hours24 >= 12 ? "PM" : "AM",
            });
          }}
        >
          12h
        </button>
      </div>
      <div className="dtp-time__wheels">
        {hourCycle === "24" ? (
          <TimeWheel
            label="Hour"
            values={HOURS_24}
            value={draft.hours24 as (typeof HOURS_24)[number]}
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
        ) : (
          <TimeWheel
            label="Hour"
            values={HOURS_12}
            value={draft.hours12 as (typeof HOURS_12)[number]}
            format={(item) => String(item).padStart(2, "0")}
            onChange={(hours12) =>
              onDraft({
                ...draft,
                hours12,
                hours24: toHours24(hours12, draft.period),
              })
            }
          />
        )}
        <TimeWheel
          label="Minute"
          values={MINUTE_OPTIONS}
          value={draft.minutes as (typeof MINUTE_OPTIONS)[number]}
          format={(item) => String(item).padStart(2, "0")}
          onChange={(minutes) => onDraft({ ...draft, minutes })}
        />
        {hourCycle === "12" ? (
          <div className="dtp-period" role="group" aria-label="AM or PM">
            {(["AM", "PM"] as const).map((period) => (
              <button
                key={period}
                type="button"
                aria-pressed={draft.period === period}
                onClick={() =>
                  onDraft({
                    ...draft,
                    period,
                    hours24: toHours24(draft.hours12, period),
                  })
                }
              >
                {period}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <button type="button" className="btn btn--primary btn--block dtp-time__save" onClick={onSave}>
        Save
      </button>
    </div>
  );
}

function MonthGrid({
  month,
  pickupAt,
  returnAt,
  onSelect,
}: {
  month: Date;
  pickupAt: string;
  returnAt: string;
  onSelect: (day: Date) => void;
}) {
  const pickup = parseLocalDateTime(pickupAt);
  const returning = parseLocalDateTime(returnAt);
  const cells = useMemo(() => monthGrid(month.getFullYear(), month.getMonth()), [month]);
  return (
    <div className="dtp-month">
      <p className="dtp-month__title">{formatMonthTitle(month)}</p>
      <div className="dtp-month__weekdays">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="dtp-month__grid">
        {cells.map((day, index) => {
          if (!day) {
            return <span key={`empty-${index}`} className="dtp-day dtp-day--empty" />;
          }
          const selected =
            (pickup && isSameDay(day, pickup)) || (returning && isSameDay(day, returning));
          const disabled = isPastDay(day);
          return (
            <button
              key={day.toISOString()}
              type="button"
              className={selected ? "dtp-day is-selected" : "dtp-day"}
              disabled={disabled}
              aria-pressed={selected ? true : undefined}
              aria-label={day.toLocaleDateString("en-US", {
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
  onActivate,
  onTime,
}: {
  legend: string;
  value: string;
  active: boolean;
  timeOpen: boolean;
  onActivate: () => void;
  onTime: () => void;
}) {
  const date = parseLocalDateTime(value);
  return (
    <div className={active ? "dtp-leg is-active" : "dtp-leg"}>
      <button type="button" className="dtp-leg__date" onClick={onActivate}>
        <span className="dtp-leg__dot" aria-hidden="true" />
        <span>
          <span className="dtp-leg__label">{legend}</span>
          <span className="dtp-leg__value">{value ? formatFooterDate(value) : "Select a date"}</span>
        </span>
      </button>
      <div className="dtp-leg__time">
        <span className="dtp-leg__label">{legend.replace(" date", " time")}</span>
        <button
          type="button"
          className={timeOpen ? "dtp-time-toggle is-open" : "dtp-time-toggle"}
          disabled={!value}
          aria-expanded={timeOpen}
          aria-haspopup="dialog"
          onClick={onTime}
        >
          {date ? formatTime24(date) : "—"}
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
  const [hourCycle, setHourCycle] = useState<HourCycle>("24");
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(parseLocalDateTime(pickupAt) ?? new Date()),
  );
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 0 });
  const [placed, setPlaced] = useState(false);
  const [timeDraft, setTimeDraft] = useState<TimeDraft>(() => splitTime(pickupAt));

  useEffect(() => {
    if (!allowReturn) {
      setReturnEnabled(false);
      return;
    }
    if (returnAt) {
      setReturnEnabled(true);
    }
  }, [allowReturn, returnAt]);

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
    const left = Math.max(
      gutter,
      Math.min(rect.left, window.innerWidth - estimatedWidth - gutter),
    );
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
    const pickup = parseLocalDateTime(pickupAt);
    if (!returnEnabled || activeLeg === "pickup" || !pickup) {
      const nextPickup = combineDateAndTime(day, pickupAt);
      onPickupChange(nextPickup);
      const currentReturn = parseLocalDateTime(returnAt);
      const nextPickupDate = parseLocalDateTime(nextPickup);
      if (
        currentReturn &&
        nextPickupDate &&
        currentReturn.getTime() <= nextPickupDate.getTime()
      ) {
        onReturnChange("");
      }
      if (returnEnabled) {
        setActiveLeg("return");
      }
      return;
    }
    if (isSameDay(day, pickup) || isBeforeDay(day, pickup)) {
      onPickupChange(combineDateAndTime(day, pickupAt));
      return;
    }
    onReturnChange(combineDateAndTime(day, returnAt || pickupAt));
  }

  function openTime(leg: Leg) {
    const source = leg === "return" ? returnAt : pickupAt;
    if (!source) {
      return;
    }
    setTimeDraft(splitTime(source));
    setTimeTarget((current) => (current === leg ? null : leg));
    setActiveLeg(leg);
  }

  function saveTime() {
    if (!timeTarget) {
      return;
    }
    const source = timeTarget === "return" ? returnAt : pickupAt;
    if (!source) {
      return;
    }
    const hours24 =
      hourCycle === "24" ? timeDraft.hours24 : toHours24(timeDraft.hours12, timeDraft.period);
    const next = applyTime(source, hours24, timeDraft.minutes);
    if (timeTarget === "return") {
      onReturnChange(next);
    } else {
      onPickupChange(next);
    }
    setTimeTarget(null);
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
    setActiveLeg("pickup");
    if (timeTarget === "return") {
      setTimeTarget(null);
    }
  }

  const canPrev = viewMonth > startOfMonth(new Date());
  const error = pickupError || returnError;
  const roundtrip = allowReturn && Boolean(returnAt);
  const twoMonths = allowReturn && returnEnabled;

  return (
    <div className={roundtrip ? "dtp dtp--roundtrip" : "dtp"} ref={triggerRef}>
      {roundtrip ? (
        <div
          className={open ? "dtp-trigger dtp-trigger--roundtrip is-open" : "dtp-trigger dtp-trigger--roundtrip"}
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
              <span className={pickupAt ? "dtp-trigger__value" : "dtp-trigger__value is-placeholder"}>
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
              <span className={returnAt ? "dtp-trigger__value" : "dtp-trigger__value is-placeholder"}>
                {returnAt ? formatCompactDateTime(returnAt) : "Select date"}
              </span>
            </span>
          </button>
          <button type="button" className="dtp-clear" aria-label="Remove return" onClick={clearReturn}>
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
                    pickupAt={pickupAt}
                    returnAt={returnAt}
                    onSelect={selectDay}
                  />
                  {twoMonths ? (
                    <MonthGrid
                      month={addMonths(viewMonth, 1)}
                      pickupAt={pickupAt}
                      returnAt={returnAt}
                      onSelect={selectDay}
                    />
                  ) : null}
                </div>
                <div className="dtp-footer">
                  <FooterLeg
                    legend="Pickup date"
                    value={pickupAt}
                    active={activeLeg === "pickup"}
                    timeOpen={timeTarget === "pickup"}
                    onActivate={() => setActiveLeg("pickup")}
                    onTime={() => openTime("pickup")}
                  />
                  {allowReturn && returnEnabled ? (
                    <FooterLeg
                      legend="Return date"
                      value={returnAt}
                      active={activeLeg === "return"}
                      timeOpen={timeTarget === "return"}
                      onActivate={() => setActiveLeg("return")}
                      onTime={() => openTime("return")}
                    />
                  ) : null}
                </div>
              </div>
              {timeTarget ? (
                <TimePanel
                  title={timeTarget === "return" ? "Return Time" : "Pickup Time"}
                  hourCycle={hourCycle}
                  draft={timeDraft}
                  onHourCycle={setHourCycle}
                  onDraft={setTimeDraft}
                  onSave={saveTime}
                />
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
