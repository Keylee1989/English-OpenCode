import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AiSettingsPage from "@/pages/AiSettingsPage";

describe("AiSettingsPage model combobox", () => {
  it("renders a single editable model input backed by a datalist and a fetch button", () => {
    render(<AiSettingsPage />);
    const input = screen.getByLabelText(/模型（Model）/);
    expect(input).toBeTruthy();
    // The input is a plain text input; it must stay editable (native datalist).
    expect((input as HTMLInputElement).value).toBe("");
    // Native datalist is present so selecting a candidate writes into the SAME input.
    expect(document.getElementById("ai-model-candidates")).toBeTruthy();
    expect(screen.getByRole("button", { name: "获取模型" })).toBeTruthy();
  });

  it("writes typed input into the model state (stays editable)", () => {
    render(<AiSettingsPage />);
    const input = screen.getByLabelText(/模型（Model）/) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "gpt-custom-123" } });
    expect(input.value).toBe("gpt-custom-123");
  });

  it("renders the API Key as a full-width, own-row field with show/hide toggle", () => {
    render(<AiSettingsPage />);
    const key = document.getElementById("ai-key") as HTMLInputElement;
    expect(key).toBeTruthy();
    expect(key.type).toBe("password");
    expect(screen.getByRole("button", { name: "显示 Key" })).toBeTruthy();
    // Toggle reveals the key.
    fireEvent.click(screen.getByRole("button", { name: "显示 Key" }));
    expect((document.getElementById("ai-key") as HTMLInputElement).type).toBe("text");
  });
});