import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChatMessageRenderer from "@/components/chat/ChatMessageRenderer";
import { isSafeUrl, normalizeStreamingMarkdown } from "@/components/chat/markdown-config";

describe("ChatMessageRenderer — Production Rich Text & Security Suite", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("T01 — Bold: render **Giỗ tổ dòng họ** thành <strong> không lộ dấu **", () => {
    const { container } = render(
      <ChatMessageRenderer content="**Giỗ tổ dòng họ**: Ngày lễ lớn nhất" />
    );
    const strong = container.querySelector("strong");
    expect(strong).toBeInTheDocument();
    expect(strong?.textContent).toBe("Giỗ tổ dòng họ");
    expect(container.textContent).not.toContain("**");
  });

  it("T02 — Italic: render *Ngày giỗ* thành <em> không lộ dấu *", () => {
    const { container } = render(<ChatMessageRenderer content="*Ngày giỗ* tổ tiên" />);
    const em = container.querySelector("em");
    expect(em).toBeInTheDocument();
    expect(em?.textContent).toBe("Ngày giỗ");
    expect(container.textContent).not.toContain("*");
  });

  it("T03 — Heading: render ## Các ngày lễ thành <h2> và hạ H1 xuống H2", () => {
    const { container } = render(
      <ChatMessageRenderer content={"# Tiêu đề lớn\n\n## Các ngày lễ\n\n### Chi tiết"} />
    );
    const h1 = container.querySelector("h1");
    const h2s = container.querySelectorAll("h2");
    const h3 = container.querySelector("h3");
    expect(h1).toBeNull();
    expect(h2s.length).toBe(2);
    expect(h2s[1]?.textContent).toBe("Các ngày lễ");
    expect(h3?.textContent).toBe("Chi tiết");
  });

  it("T04 — List: render ordered & unordered Markdown lists", () => {
    const md = [
      "Dòng họ Phạm Phú có các ngày lễ:",
      "",
      "- **Giỗ tổ dòng họ:** Tại nhà thờ tộc.",
      "- **Tiết Thanh Minh:** Tảo mộ tổ tiên.",
      "",
      "1. Bước một",
      "2. Bước hai",
    ].join("\n");
    const { container } = render(<ChatMessageRenderer content={md} />);
    const ulItems = container.querySelectorAll("ul > li");
    const olItems = container.querySelectorAll("ol > li");
    expect(ulItems.length).toBe(2);
    expect(olItems.length).toBe(2);
    expect(container.textContent).not.toContain("**");
  });

  it("T05 — Vietnamese Unicode: giữ nguyên dấu tiếng Việt và tên riêng", () => {
    const md = "**Cụ Phạm Phú Thứ** (1821–1882), quê ở *Điện Bàn, Quảng Nam*.";
    const { container } = render(<ChatMessageRenderer content={md} />);
    expect(container.textContent).toContain("Cụ Phạm Phú Thứ");
    expect(container.textContent).toContain("Điện Bàn, Quảng Nam");
  });

  it("T06 — Streaming: incremental chunks ghép lại render đúng Markdown hoàn chỉnh", () => {
    const chunks = [
      "Dòng họ có:\n\n- **Giỗ ",
      "tổ dòng họ:** ",
      "Ngày lễ lớn.\n```json\n{\"ok\": true}",
    ];
    const partial = chunks.join("");
    const { rerender, container } = render(
      <ChatMessageRenderer content={partial} isStreaming />
    );
    // Code fence chưa đóng không làm crash parser khi streaming
    expect(container.querySelector("pre")).toBeInTheDocument();

    // Khi stream kết thúc
    const finalContent = `${partial}\n\`\`\``;
    rerender(<ChatMessageRenderer content={finalContent} isStreaming={false} />);
    expect(container.querySelector("strong")?.textContent).toBe("Giỗ tổ dòng họ:");
    expect(container.textContent).not.toContain("**");
  });

  it("T07 — XSS: chặn script, img onerror, và javascript: links", () => {
    const xss = [
      "<script>window.__xss=1</script>",
      "<img src=x onerror=\"alert(1)\" />",
      "[Bấm vào đây](javascript:alert(1))",
      "[Link hợp lệ](/events)",
      "[Trang ngoài](https://example.com)",
    ].join("\n\n");

    const { container } = render(<ChatMessageRenderer content={xss} />);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    const links = Array.from(container.querySelectorAll("a"));
    expect(links.every((a) => !a.getAttribute("href")?.startsWith("javascript:"))).toBe(true);
    expect(screen.getByText("Bấm vào đây").tagName).toBe("SPAN");

    const internalLink = screen.getByRole("link", { name: "Link hợp lệ" });
    expect(internalLink).toHaveAttribute("href", "/events");

    const externalLink = screen.getByRole("link", { name: /Trang ngoài/ });
    expect(externalLink).toHaveAttribute("target", "_blank");
    expect(externalLink).toHaveAttribute("rel", "noopener noreferrer nofollow");
  });

  it("T08 — Long text, GFM Table & Code Block Copy", () => {
    const md = [
      "| Sự kiện | Địa điểm | Ghi chú |",
      "| :--- | :--- | :--- |",
      "| Giỗ tổ | Điện Bàn | Hàng năm |",
      "",
      "```text",
      "SELECT * FROM persons LIMIT 1;",
      "```",
    ].join("\n");

    const { container } = render(<ChatMessageRenderer content={md} />);
    const tableWrapper = container.querySelector("table")?.parentElement;
    expect(tableWrapper?.className).toContain("overflow-x-auto");
    expect(container.querySelector("td")?.textContent).toBe("Giỗ tổ");

    const copyBtn = screen.getByRole("button", { name: "Sao chép đoạn mã" });
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("SELECT * FROM persons LIMIT 1;");
  });

  it("T12 — Legacy & Helper guards: URL protocol validation và normalizeStreamingMarkdown", () => {
    expect(isSafeUrl("/events")).toBe(true);
    expect(isSafeUrl("https://tocphamphu.vn")).toBe(true);
    expect(isSafeUrl("//evil.com")).toBe(false);
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("data:text/html,<script>")).toBe(false);

    const unclosedFence = "```ts\nconst a = 1;";
    expect(normalizeStreamingMarkdown(unclosedFence, true)).toContain("\n```");
    expect(normalizeStreamingMarkdown("**Giỗ tổ**", false)).toBe("**Giỗ tổ**");
  });
});
