import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import GenericModal from "./GenericModal";

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open dialog</button>
      <GenericModal isOpen={open} onClose={() => setOpen(false)} title="Test dialog">
        <button type="button">Inside action</button>
      </GenericModal>
    </>
  );
}

function TypingModalHarness() {
  const [code, setCode] = useState("");

  return (
    <GenericModal isOpen onClose={() => {}} title="Test dialog">
      <label htmlFor="admin-code">Admin code</label>
      <input
        id="admin-code"
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />
    </GenericModal>
  );
}

describe("GenericModal", () => {
  it("moves focus into the dialog and restores it after Escape", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });

    await user.click(trigger);
    await waitFor(() => expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    expect(trigger).toHaveFocus();
  });

  it("keeps focus in a controlled input when its parent re-renders", async () => {
    const user = userEvent.setup();
    render(<TypingModalHarness />);
    const input = screen.getByLabelText("Admin code");

    await user.click(input);
    await user.type(input, "ssgs");

    expect(input).toHaveValue("ssgs");
    expect(input).toHaveFocus();
  });
});
