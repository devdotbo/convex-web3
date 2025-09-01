"use client";

import { FixedSizeGrid as Grid } from "react-window";
import { useMutation, useQueries } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useMemo } from "react";
import { useMeasure } from "react-use";
import Link from "next/link";
import { useAppKitAccount } from "@reown/appkit/react";
import { NUM_BOXES, NUM_DOCUMENTS, isChecked, shiftBit, ensureArrayBuffer } from "@/lib/checkboxes";

export default function CheckboxesPage() {
  const [ref, { width, height }] = useMeasure<HTMLDivElement>();
  const ensureSeeded = useMutation(api.checkboxes.ensureSeeded);
  const { isConnected } = useAppKitAccount();

  useEffect(() => {
    if (isConnected) {
      void ensureSeeded({});
    }
  }, [ensureSeeded, isConnected]);

  const queries = useMemo(
    () =>
      Array(NUM_DOCUMENTS)
        .fill(null)
        .map((_, idx) => ({
          query: api.checkboxes.get,
          args: { documentIdx: idx },
        }))
        .reduce(
          (acc, curr) => ({ ...acc, [curr.args.documentIdx.toString()]: curr }),
          {} as Record<string, { query: typeof api.checkboxes.get; args: { documentIdx: number } }>
        ),
    []
  );

  const boxRecord = useQueries(queries);
  const boxes = Object.entries(boxRecord).map(([, value]) => value);

  const numCheckedBoxes = boxes.reduce(
    (acc, curr) =>
      acc +
      (curr === undefined
        ? 0
        : new Uint8Array(curr).reduce(
            (inner, byte) => inner + byte.toString(2).split("1").length - 1,
            0
          )),
    0
  );

  const numColumns = Math.max(1, Math.ceil((width - 40) / 30));
  const numRows = Math.ceil(NUM_BOXES / numColumns);

  return (
    <div
      key={`${width}-${height}`}
      style={{ display: "flex", flexDirection: "column", gap: "0.25rem", height: "95vh", width: "99vw" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: "bold", marginBottom: "0.25rem" }}>One Million Checkboxes</div>
          <div>{numCheckedBoxes} boxes checked</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Link href="/">Back</Link>
        </div>
      </div>
      {!isConnected && (
        <div style={{ padding: "0.5rem" }}>
          Please connect your wallet to toggle checkboxes.
        </div>
      )}
      <div style={{ width: "100%", height: "100%", flexGrow: 1 }} ref={ref}>
        <Grid
          columnCount={numColumns}
          columnWidth={30}
          height={height}
          rowCount={numRows}
          rowHeight={30}
          width={width}
          itemData={{ flattenedBoxes: boxes, numColumns, numRows }}
        >
          {Cell}
        </Grid>
      </div>
    </div>
  );
}

function Cell({
  style,
  rowIndex,
  columnIndex,
  data,
}: {
  style: React.CSSProperties;
  rowIndex: number;
  columnIndex: number;
  data: { flattenedBoxes: ArrayBuffer[]; numColumns: number; numRows: number };
}) {
  const { flattenedBoxes, numColumns } = data;
  const index = rowIndex * numColumns + columnIndex;
  const documentIdx = index % NUM_DOCUMENTS;
  const arrayIdx = Math.floor(index / NUM_DOCUMENTS);
  const document = flattenedBoxes[documentIdx];
  const view = document === undefined ? undefined : new Uint8Array(document);

  const currentlyChecked = view && isChecked(view, arrayIdx);
  const isLoading = view === undefined;

  const toggle = useMutation(api.checkboxes.toggle).withOptimisticUpdate((localStore) => {
    const currentValue = localStore.getQuery(api.checkboxes.get, { documentIdx });
    if (currentValue !== undefined && currentValue !== null) {
      const localView = new Uint8Array(ensureArrayBuffer(currentValue));
      const newBytes = shiftBit(localView, arrayIdx, !currentlyChecked)?.buffer;
      if (newBytes) {
        localStore.setQuery(api.checkboxes.get, { documentIdx }, ensureArrayBuffer(newBytes));
      }
    }
  });
  const { isConnected } = useAppKitAccount();

  if (index >= NUM_BOXES) {
    return null;
  }
  const onClick = () => {
    if (!isConnected) return;
    void toggle({ documentIdx, arrayIdx, checked: !currentlyChecked });
  };
  return (
    <div style={style} key={`${documentIdx}-${arrayIdx}`} id={`${documentIdx}-${arrayIdx}`}>
      <input
        style={{ margin: "0.25rem", cursor: isLoading ? undefined : "pointer", width: "24px", height: "24px", padding: "8px" }}
        type="checkbox"
        checked={!!currentlyChecked}
        disabled={isLoading || !isConnected}
        onChange={onClick}
      />
    </div>
  );
}


