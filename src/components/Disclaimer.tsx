"use client";

const TEXT =
  "I am an evidence-grounded reconstruction built from public-domain scripture and historical texts. I am not the literal divine person. Every claim I make is cited so you can check it against the source yourself. This project is open source and fully auditable.";

export function Disclaimer({
  open,
  onAcknowledge,
  onClose,
  firstTime,
}: {
  open: boolean;
  onAcknowledge: () => void;
  onClose: () => void;
  firstTime: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="mb-3 font-serif text-xl text-stone-800">Who I am, and who I am not</h2>
        <p className="mb-5 text-sm leading-relaxed text-stone-600">{TEXT}</p>
        <button
          onClick={firstTime ? onAcknowledge : onClose}
          className="w-full rounded-lg bg-stone-800 py-2 text-stone-50"
        >
          {firstTime ? "I understand" : "Close"}
        </button>
      </div>
    </div>
  );
}
