"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface AgendaCalendarProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  fechasConAgenda: string[]; // Array of YYYY-MM-DD
}

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

function toLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function AgendaCalendar({ value, onChange, fechasConAgenda }: AgendaCalendarProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => value ? toLocalDate(value) : new Date());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const agendaSet = new Set(fechasConAgenda);

  const todayStr = formatDateStr(new Date());
  const selectedStr = value || "";

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Celdas del grid: empezamos en Lunes
  const firstDow = new Date(year, month, 1).getDay();
  const blancos = firstDow === 0 ? 6 : firstDow - 1;
  const diasEnMes = new Date(year, month + 1, 0).getDate();

  const celdas: (number | null)[] = [
    ...Array(blancos).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ];

  const displayValue = value
    ? (() => {
        const d = toLocalDate(value);
        return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
      })()
    : "Seleccionar fecha";

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2 min-w-[165px] hover:border-blue-300 transition-all"
      >
        <Calendar size={16} className="text-blue-600 flex-shrink-0" />
        <span className="text-sm font-bold text-slate-700">{displayValue}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-13 z-50 bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 w-72 mt-1">
          {/* Navegación mes */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded-xl hover:bg-slate-100 transition-all">
              <ChevronLeft size={18} className="text-slate-600" />
            </button>
            <span className="text-sm font-black text-slate-800">
              {MESES[month]} {year}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-xl hover:bg-slate-100 transition-all">
              <ChevronRight size={18} className="text-slate-600" />
            </button>
          </div>

          {/* Cabecera días */}
          <div className="grid grid-cols-7 mb-1">
            {["L","M","M","J","V","S","D"].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-black text-slate-400 uppercase py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Grid de días */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {celdas.map((dia, i) => {
              if (!dia) return <div key={i} />;

              const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
              const isToday    = dateStr === todayStr;
              const isSelected = dateStr === selectedStr;
              const hasAgenda  = agendaSet.has(dateStr);

              return (
                <button
                  key={i}
                  onClick={() => { onChange(dateStr); setOpen(false); }}
                  className={`
                    relative flex flex-col items-center justify-center h-9 w-9 mx-auto rounded-xl
                    text-sm font-bold transition-all
                    ${isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : ""}
                    ${isToday && !isSelected ? "ring-2 ring-blue-400 text-blue-700" : ""}
                    ${!isSelected && !isToday ? "hover:bg-slate-100 text-slate-700" : ""}
                  `}
                >
                  <span className="leading-none">{dia}</span>
                  {hasAgenda && (
                    <span
                      className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                        isSelected ? "bg-white" : "bg-blue-500"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Leyenda */}
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            <span className="text-[10px] text-slate-500 font-bold">Agenda cargada</span>
            <span className="w-2 h-2 rounded-full ring-2 ring-blue-400 flex-shrink-0 ml-3" />
            <span className="text-[10px] text-slate-500 font-bold">Hoy</span>
          </div>
        </div>
      )}
    </div>
  );
}
