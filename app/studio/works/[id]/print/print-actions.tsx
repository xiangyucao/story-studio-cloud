"use client";

export function PrintActions({ backHref, printLabel, backLabel }: { backHref: string; printLabel: string; backLabel: string }) {
  return <nav className="print-actions"><a href={backHref}>← {backLabel}</a><button onClick={() => window.print()}>{printLabel}</button></nav>;
}
