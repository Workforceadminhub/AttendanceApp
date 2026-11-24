import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ConfirmProvider, useConfirm } from "./ConfirmDialog";

function Trigger({ options, onResult }) {
  const confirm = useConfirm();
  return (
    <button type="button" onClick={async () => onResult(await confirm(options))}>
      Open
    </button>
  );
}

function open(options) {
  const onResult = vi.fn();
  render(
    <ConfirmProvider>
      <Trigger options={options} onResult={onResult} />
    </ConfirmProvider>
  );
  fireEvent.click(screen.getByRole("button", { name: "Open" }));
  return onResult;
}

describe("ConfirmDialog", () => {
  it("resolves true when confirmed", async () => {
    const onResult = open({ title: "Delete meeting", message: "Delete this meeting?", confirmLabel: "Delete" });
    const dialog = await screen.findByRole("dialog", { name: "Delete meeting" });
    expect(dialog).toHaveTextContent("Delete this meeting?");
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
  });

  it("resolves false on cancel and on Escape", async () => {
    const onResult = open({ title: "Delete admin" });
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(onResult).toHaveBeenCalledTimes(2));
    expect(onResult).toHaveBeenLastCalledWith(false);
  });

  it("keeps a destructive action disabled until the phrase is typed", async () => {
    const onResult = open({ title: "Delete worker permanently", confirmLabel: "Delete worker", requireText: "DELETE" });
    await screen.findByRole("dialog");
    const submit = screen.getByRole("button", { name: "Delete worker" });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Type DELETE to confirm"), { target: { value: "delete" } });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Type DELETE to confirm"), { target: { value: "DELETE" } });
    fireEvent.click(submit);
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
  });
});
