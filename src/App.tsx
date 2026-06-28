import { useEffect, useMemo, useRef, useState } from "react";
import ChatBoxReader from "alt1/chatbox";
import { mixColor } from "alt1";
import { detectShieldPhrase, nextDefenseForCall } from "./phraseDetection";
import { alt1, displayDetectionMessage } from "./helpers";
import { shouldProcessLineWithReason, markResetWithCooldown } from "./watermark";
import { dbg } from "./logger";

const sampleText = `shield us from your shadow
shield us from your shadow
shield us from your shadow
shield us from your shadow`;

const missCalls = new Set([3, 6, 8, 10, 12, 13, 14]);

type ShadowEvent = {
  count: number;
  line: string;
  status: "BLOCK" | "MISS" | "FINISH";
  nextDefense: string;
};

const createNewReader = () => {
  const reader = new ChatBoxReader();

  reader.readargs = {
    colors: [
      mixColor(255, 160, 0),
      mixColor(45, 186, 21),
      mixColor(45, 184, 20),
      mixColor(159, 255, 159),
      mixColor(255, 82, 86),
      mixColor(225, 35, 35),
      mixColor(235, 47, 47),
      mixColor(153, 255, 153),
      mixColor(155, 48, 255),
      mixColor(255, 0, 255),
      mixColor(0, 255, 255),
      mixColor(255, 0, 0),
      mixColor(255, 255, 255),
      mixColor(127, 169, 255),
      mixColor(0, 153, 0),
      mixColor(204, 51, 153),
      mixColor(196, 184, 72),
    ],
  };

  return reader;
};

const tsToSec = (text: string): number | null => {
  const m = text.match(/\[(\d{2}):(\d{2}):(\d{2})\]/);
  if (!m) return null;
  const h = +m[1];
  const mi = +m[2];
  const s = +m[3];
  return h * 3600 + mi * 60 + s;
};

const hash = (s: string) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
};

function App() {
  const [input, setInput] = useState(sampleText);
  const [events, setEvents] = useState<ShadowEvent[]>([]);
  const [alt1Available, setAlt1Available] = useState(Boolean(alt1));
  const readerRef = useRef<ChatBoxReader | null>(null);

  useEffect(() => {
    if (!alt1Available) return;
    readerRef.current = createNewReader();
  }, [alt1Available]);

  useEffect(() => {
    if (!alt1Available || !readerRef.current) return;

    let lastBatchHash = "";
    let lastSec = -Infinity;
    const seenThisSec = new Set<string>();

    const tick = () => {
      try {
        let chatLines = readerRef.current?.read();

        if (chatLines === null) {
          const findResult = readerRef.current?.find();

          if (readerRef.current?.pos) {
            alt1?.overLayRect(
              mixColor(45, 186, 21),
              readerRef.current.pos.mainbox.rect.x,
              readerRef.current.pos.mainbox.rect.y,
              readerRef.current.pos.mainbox.rect.width,
              readerRef.current.pos.mainbox.rect.height,
              1000,
              1
            );
          }

          if (findResult === null) {
            displayDetectionMessage(
              "Can't detect chatbox. Press Enter and then retry.",
              600,
              30
            );
            return;
          }

          chatLines = readerRef.current?.read() || [];
        }

        const batchStr = chatLines.map((line) => line.text).join("\n");
        const batchHash = hash(batchStr);

        if (batchHash === lastBatchHash) return;
        lastBatchHash = batchHash;

        const enriched = chatLines
          .map((line, idx) => ({ line, sec: tsToSec(line.text), idx }))
          .sort((a, b) => (a.sec ?? Infinity) - (b.sec ?? Infinity) || a.idx - b.idx);

        const newLines = [] as typeof enriched;
        for (const e of enriched) {
          if (e.sec == null) continue;
          if (e.sec > lastSec) {
            lastSec = e.sec;
            seenThisSec.clear();
          } else if (e.sec < lastSec) {
            continue;
          }

          const key = hash(e.line.text);
          if (seenThisSec.has(key)) continue;
          seenThisSec.add(key);
          newLines.push(e);
        }

        for (const { line } of newLines) {
          const gate = shouldProcessLineWithReason(line.text);
          if (!gate.allow) {
            dbg("gate/BLOCK", gate);
            continue;
          }

          if (detectShieldPhrase(line.text)) {
            setEvents((prev) => {
              const count = prev.length + 1;
              const status = count === 15 ? "FINISH" : count <= 2 || !missCalls.has(count) ? "BLOCK" : "MISS";
              const nextDefense = nextDefenseForCall(count + 1);
              return [...prev, { count, line: line.text, status, nextDefense }];
            });
            displayDetectionMessage("Shadow line detected", 1200, 32);
          }
        }
      } catch (error) {
        console.error(error);
        displayDetectionMessage("Detection error", 600);
      }
    };

    const interval = setInterval(tick, 600);
    return () => clearInterval(interval);
  }, [alt1Available]);

  const lines = useMemo(
    () => input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
    [input]
  );

  const manualEvents = useMemo(
    () =>
      lines
        .map((line) => ({ line, detected: detectShieldPhrase(line) }))
        .filter((item) => item.detected)
        .map((item, index) => {
          const count = index + 1;
          const status = count === 15 ? "FINISH" : count <= 2 || !missCalls.has(count) ? "BLOCK" : "MISS";
          return {
            count,
            line: item.line,
            status,
            nextDefense: nextDefenseForCall(count + 1),
          };
        }),
    [lines]
  );

  const displayEvents = alt1Available ? events : manualEvents;
  const detectedCount = displayEvents.length;
  const actionCount = detectedCount;
  const nextActionCount = detectedCount + 1;
  const getPredictedStatus = (count: number) =>
    count === 15 ? "FINISH" : count <= 2 || !missCalls.has(count) ? "BLOCK" : "MISS";

  const actionPredictedStatus = getPredictedStatus(actionCount);
  const nextActionPredictedStatus = getPredictedStatus(nextActionCount);
  const findNextSpecialDefense = (start: number) => {
    for (let i = start; i <= 100; i++) {
      const def = nextDefenseForCall(i);
      if ((def || "").toLowerCase() !== "block") {
        return { cycle: i, defense: def };
      }
    }
    return null;
  };

  const nextSpecial = findNextSpecialDefense(nextActionCount);
  const nextSpecialCycle = nextSpecial ? nextSpecial.cycle : null;
  const nextSpecialName = nextSpecial ? nextSpecial.defense : "Block";

  return (
    <div className="app-shell">

      <main>
        <section className="cycle-panel">
          <div className="cycle-card">
            <div>
              <span className="label">Cycle</span>
              <strong>{detectedCount}</strong>
            </div>
            <div>
              <span className="label">Action</span>
              <strong className={
                actionPredictedStatus === "BLOCK"
                  ? "block"
                  : actionPredictedStatus === "FINISH"
                  ? "finish"
                  : "miss"
              }>
                {actionPredictedStatus}
              </strong>
            </div>
            <div>
              <span className="label">Next action</span>
              <strong className={
                nextActionPredictedStatus === "BLOCK"
                  ? "block"
                  : nextActionPredictedStatus === "FINISH"
                  ? "finish"
                  : "miss"
              }>
                {nextActionPredictedStatus}
              </strong>
            </div>
            <div>
              <span className="label">Next defensive</span>
              <strong>
                {nextSpecialName}
                {nextSpecialCycle ? ` (cycle ${nextSpecialCycle})` : ""}
              </strong>
            </div>
          </div>
          <div className="reset-row">
            <button
              type="button"
              onClick={() => {
                setEvents([]);
                markResetWithCooldown(0);
                displayDetectionMessage("Reset", 800, 30);
              }}
            >
              Reset
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
