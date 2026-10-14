import {
  useEffect,
  useState,
} from "react";

import {
  getInventoryItem,
  type InventoryItemId,
} from "./items";

import {
  useGameStore,
} from "../../store/useGameStore";

function ItemIcon({
  item,
}: {
  item: InventoryItemId;
}) {
  if (
    item === "overlay-sheet"
  ) {
    return (
      <svg
        width="42"
        height="32"
        viewBox="0 0 42 32"
        aria-hidden="true"
      >
        <rect
          x="5"
          y="4"
          width="30"
          height="22"
          rx="2"
          fill="rgba(145, 186, 190, 0.34)"
          stroke="#c8dddf"
          strokeWidth="2"
          transform="rotate(-6 20 15)"
        />
        <path
          d="M12 22 L27 8"
          stroke="#6e9194"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle
          cx="27"
          cy="19"
          r="4"
          fill="none"
          stroke="#6e9194"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (
    item === "small-gear"
  ) {
    return (
      <svg
        width="38"
        height="38"
        viewBox="0 0 38 38"
        aria-hidden="true"
      >
        <g
          fill="none"
          stroke="#c9a264"
          strokeWidth="3"
        >
          <circle
            cx="19"
            cy="19"
            r="11"
          />
          <circle
            cx="19"
            cy="19"
            r="4"
          />
          <path d="M19 2 V8 M19 30 V36 M2 19 H8 M30 19 H36 M7 7 L11 11 M27 27 L31 31 M31 7 L27 11 M11 27 L7 31" />
        </g>
      </svg>
    );
  }

  if (
    item === "brass-key"
  ) {
    return (
      <svg
        width="42"
        height="36"
        viewBox="0 0 42 36"
        aria-hidden="true"
      >
        <g
          fill="none"
          stroke="#c9a264"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle
            cx="13"
            cy="15"
            r="7"
          />
          <path d="M19 19 L35 30 M29 26 L33 22 M33 29 L37 25" />
        </g>
      </svg>
    );
  }

  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 42 42"
      aria-hidden="true"
    >
      <g
        fill="none"
        stroke="#c9a264"
        strokeWidth="2.4"
        strokeLinejoin="round"
      >
        <path d="M17 4 H25 V8 H29 L34 13 V17 H38 V25 H34 V29 L29 34 H25 V38 H17 V34 H13 L8 29 V25 H4 V17 H8 V13 L13 8 H17 Z" />
        <circle
          cx="21"
          cy="21"
          r="11"
          stroke="#8f6839"
        />
        <path d="M21 15 L27 21 L21 27 L15 21 Z" />
      </g>
      <circle
        cx="21"
        cy="21"
        r="2.3"
        fill="#d8b574"
      />
    </svg>
  );
}

export function InventoryBar() {
  const inventory =
    useGameStore(
      (state) =>
        state.inventory,
    );

  const selectedItem =
    useGameStore(
      (state) =>
        state.selectedItem,
    );

  const selectItem =
    useGameStore(
      (state) =>
        state.selectItem,
    );

  const lastAcquiredItem =
    useGameStore(
      (state) =>
        state.lastAcquiredItem,
    );

  const acquisitionSerial =
    useGameStore(
      (state) =>
        state.acquisitionSerial,
    );

  const [
    noticeItem,
    setNoticeItem,
  ] = useState<
    InventoryItemId | null
  >(null);

  const [
    noticeSerial,
    setNoticeSerial,
  ] = useState(
    acquisitionSerial,
  );

  // Show the notice when a new item arrives. Adjusting state during
  // render (instead of in an effect) avoids an extra cascading render.
  if (
    noticeSerial !==
    acquisitionSerial
  ) {
    setNoticeSerial(
      acquisitionSerial,
    );

    setNoticeItem(
      acquisitionSerial > 0
        ? lastAcquiredItem
        : null,
    );
  }

  useEffect(() => {
    if (!noticeItem) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setNoticeItem(null);
        },
        1500,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    noticeItem,
    acquisitionSerial,
  ]);

  return (
    <div className="inventory-root">
      <style>
        {`
          @keyframes inventory-acquired {
            0% { transform: scale(.68); opacity: .25; }
            60% { transform: scale(1.12); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }

          @keyframes inventory-notice {
            0% { transform: translateY(8px); opacity: 0; }
            18%, 78% { transform: translateY(0); opacity: 1; }
            100% { transform: translateY(-5px); opacity: 0; }
          }
        `}
      </style>

      {noticeItem && (
        <div
          key={
            acquisitionSerial
          }
          style={{
            animation:
              "inventory-notice 1.5s ease both",
            padding:
              "7px 11px",
            borderRadius: 8,
            color:
              "#e8dbc2",
            background:
              "rgba(19, 15, 12, 0.88)",
            border:
              "1px solid rgba(191, 149, 86, 0.46)",
            fontSize: 13,
            letterSpacing:
              "0.02em",
            boxShadow:
              "0 8px 24px rgba(0,0,0,.22)",
          }}
        >
          {
            getInventoryItem(
              noticeItem,
            ).name
          }
          を手に入れた
        </div>
      )}

      <div
        className="inventory-panel"
        data-hud="inventory"
        style={{
          background:
            "rgba(14, 12, 10, 0.78)",
          border:
            "1px solid rgba(177, 135, 76, 0.32)",
          backdropFilter:
            "blur(8px)",
          boxShadow:
            "0 10px 28px rgba(0,0,0,.22)",
        }}
      >
        <div
          className="inventory-header"
          style={{
            color:
              "rgba(229, 214, 188, 0.84)",
          }}
        >
          <span>
            持ち物
          </span>

          {selectedItem && (
            <span
              style={{
                marginLeft: 16,
                color:
                  "#dfbf84",
                letterSpacing:
                  "0.02em",
              }}
            >
              {
                getInventoryItem(
                  selectedItem,
                ).name
              }
              を選択中
            </span>
          )}
        </div>

        <div className="inventory-slots">
          {inventory.map(
            (
              item,
              index,
            ) => {
              const selected =
                item !== null &&
                item ===
                  selectedItem;

              const justAdded =
                item !== null &&
                item ===
                  lastAcquiredItem;

              const definition =
                item
                  ? getInventoryItem(
                      item,
                    )
                  : null;

              return (
                <button
                  key={index}
                  type="button"
                  disabled={
                    item === null
                  }
                  onClick={() => {
                    if (!item) return;

                    selectItem(
                      item,
                    );
                  }}
                  aria-label={
                    definition
                      ? `${definition.name}を${selected ? "選択解除" : "選択"}`
                      : `空きスロット ${index + 1}`
                  }
                  title={
                    definition
                      ?.name
                  }
                  className="inventory-slot"
                  style={{
                    border:
                      selected
                        ? "2px solid #d8ac68"
                        : "1px solid rgba(150, 116, 72, 0.42)",
                    background:
                      selected
                        ? "rgba(122, 85, 42, 0.42)"
                        : item
                          ? "rgba(37, 29, 22, 0.94)"
                          : "rgba(19, 17, 15, 0.72)",
                    boxShadow:
                      selected
                        ? "inset 0 0 0 2px rgba(229,191,126,.13), 0 0 14px rgba(194,144,76,.22)"
                        : "inset 0 0 0 1px rgba(255,255,255,.025)",
                    cursor:
                      item
                        ? "pointer"
                        : "default",
                    opacity:
                      item
                        ? 1
                        : 0.62,
                    outline:
                      "none",
                    animation:
                      justAdded &&
                      acquisitionSerial >
                        0
                        ? "inventory-acquired .34s ease-out"
                        : undefined,
                  }}
                >
                  {item && (
                    <ItemIcon
                      item={
                        item
                      }
                    />
                  )}

                  <span
                    style={{
                      position:
                        "absolute",
                      left: 5,
                      top: 3,
                      color:
                        "rgba(210, 187, 150, 0.42)",
                      fontSize: 9,
                    }}
                  >
                    {index + 1}
                  </span>
                </button>
              );
            },
          )}
        </div>

        <div
          className="inventory-footer"
          style={{
            color:
              "rgba(213, 198, 175, 0.58)",
          }}
        >
          {selectedItem
            ? `${getInventoryItem(selectedItem).name}を使用する場所を選ぶ`
            : "道具を選んで使用する"}
        </div>
      </div>
    </div>
  );
}
