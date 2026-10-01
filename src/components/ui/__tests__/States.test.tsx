import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from "@/components/ui/States";

describe("state components", () => {
  it("renders EmptyState with title and description", () => {
    render(<EmptyState title="Пусто" description="Ничего не найдено" />);
    expect(screen.getByText("Пусто")).toBeInTheDocument();
    expect(screen.getByText("Ничего не найдено")).toBeInTheDocument();
  });

  it("renders ErrorState as an alert", () => {
    render(<ErrorState description="Что-то пошло не так" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Что-то пошло не так");
  });

  it("renders ForbiddenState with a default explanation", () => {
    render(<ForbiddenState />);
    expect(screen.getByText("Доступ запрещён")).toBeInTheDocument();
  });

  it("renders LoadingState with status role for assistive tech", () => {
    render(<LoadingState label="Загружаем…" />);
    expect(screen.getByRole("status")).toHaveTextContent("Загружаем…");
  });
});
