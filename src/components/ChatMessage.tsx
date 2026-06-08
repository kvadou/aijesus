import type { ReactNode } from "react";
import type { Citation } from "@/chat/agent";
import { CitationChip } from "./CitationChip";

export interface UiMessage {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

// The model speaks in light markdown (**emphasis**, *aside*). Render those as
// real type rather than literal asterisks. Newlines are kept by pre-wrap.
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      nodes.push(<strong key={key++} className="font-bold text-stone-900">{m[1]}</strong>);
    } else {
      nodes.push(<em key={key++}>{m[2]}</em>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function ChatMessage({ m }: { m: UiMessage }) {
  const isUser = m.role === "user";

  if (isUser) {
    return (
      <div className="mb-6 flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-stone-800 px-4 py-2.5 text-stone-50 sm:max-w-[80%]">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{m.content}</p>
        </div>
      </div>
    );
  }

  // The spoken answer: set in the scripture serif, given room to breathe.
  return (
    <div className="mb-7 flex justify-start">
      <div className="max-w-[92%] sm:max-w-[85%]">
        <p className="whitespace-pre-wrap font-serif text-[1.0625rem] leading-[1.7] text-stone-800">
          {renderInline(m.content)}
        </p>
        {m.citations && m.citations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {m.citations.map((c, i) => <CitationChip key={i} c={c} />)}
          </div>
        )}
      </div>
    </div>
  );
}
