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
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="mb-3 font-serif text-2xl text-stone-800">Who I am, and who I am not</h2>
        <p className="mb-6 font-serif text-[15px] leading-relaxed text-stone-600">{TEXT}</p>
        <button
          onClick={firstTime ? onAcknowledge : onClose}
          className="flex min-h-11 w-full items-center justify-center rounded-lg bg-stone-800 text-stone-50 transition-colors hover:bg-stone-700"
        >
          {firstTime ? "I understand" : "Close"}
        </button>
      </div>
    </div>
  );
}
