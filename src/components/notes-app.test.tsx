import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockedProvider } from "@apollo/client/testing/react";
import { vi } from "vitest";

import {
  CreateNoteDocument,
  DeleteNoteDocument,
  LoginDocument,
  MeDocument,
  NotesDocument,
  UpdateNoteDocument,
} from "@/generated/graphql";
import { NotesWorkspace } from "@/components/notes-app";

const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

describe("notes ui", () => {
  it("handles login mutation envelopes", async () => {
    const onLogin = vi.fn();

    render(
      <MockedProvider
        mocks={[
          {
            request: {
              query: LoginDocument,
              variables: { username: "user@example.com" },
            },
            result: {
              data: {
                login: {
                  code: 200,
                  success: true,
                  message: "login succeeded",
                  accessToken: "token-1",
                },
              },
            },
          },
        ]}
      >
        <NotesWorkspace onLogin={onLogin} onLogout={vi.fn()} token={null} />
      </MockedProvider>
    );

    await userEvent.click(screen.getAllByRole("button", { name: "Login" })[0]);
    await userEvent.click(screen.getByRole("button", { name: "Generate token" }));

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith("token-1");
    });
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("renders, paginates, and handles mutation envelopes", async () => {
    render(
      <MockedProvider
        mocks={[
          {
            request: { query: MeDocument },
            result: { data: { me: { id: "user@example.com", username: "user@example.com" } } },
          },
          {
            request: {
              query: NotesDocument,
              variables: { input: { pageSize: 5 } },
            },
            result: {
              data: {
                notes: {
                  items: [
                    {
                      id: "note-1",
                      title: "First note",
                      content: "Hello",
                      createdAt: "2024-01-01T00:00:00.000Z",
                      updatedAt: "2024-01-01T00:00:00.000Z",
                    },
                  ],
                  pagination: {
                    next: { cursor: "Y3Vyc29yLTE", pageSize: 5, __typename: "CursorPage" },
                    previous: null,
                    total: 2,
                  },
                },
              },
            },
          },
          {
            request: {
              query: NotesDocument,
              variables: { input: { pageSize: 5, cursor: "Y3Vyc29yLTE" } },
            },
            result: {
              data: {
                notes: {
                  items: [
                    {
                      id: "note-2",
                      title: "Second note",
                      content: "World",
                      createdAt: "2024-01-02T00:00:00.000Z",
                      updatedAt: "2024-01-02T00:00:00.000Z",
                    },
                  ],
                  pagination: {
                    next: null,
                    previous: { cursor: "Y3Vyc29yLTI", pageSize: 5, __typename: "CursorPage" },
                    total: 2,
                  },
                },
              },
            },
          },
          {
            request: {
              query: CreateNoteDocument,
              variables: { input: { title: "Created note", content: "Created body" } },
            },
            result: {
              data: {
                createNote: {
                  code: 200,
                  success: true,
                  message: "note created",
                  note: {
                    id: "note-3",
                    title: "Created note",
                    content: "Created body",
                    createdAt: "2024-01-03T00:00:00.000Z",
                    updatedAt: "2024-01-03T00:00:00.000Z",
                  },
                },
              },
            },
          },
          {
            request: {
              query: NotesDocument,
              variables: { input: { pageSize: 5 } },
            },
            result: {
              data: {
                notes: {
                  items: [
                    {
                      id: "note-3",
                      title: "Created note",
                      content: "Created body",
                      createdAt: "2024-01-03T00:00:00.000Z",
                      updatedAt: "2024-01-03T00:00:00.000Z",
                    },
                  ],
                  pagination: {
                    next: null,
                    previous: null,
                    total: 1,
                  },
                },
              },
            },
          },
          {
            request: {
              query: UpdateNoteDocument,
              variables: {
                id: "note-3",
                input: { title: "Updated note", content: "Updated body" },
              },
            },
            result: {
              data: {
                updateNote: {
                  code: 200,
                  success: true,
                  message: "note updated",
                  note: {
                    id: "note-3",
                    title: "Updated note",
                    content: "Updated body",
                    createdAt: "2024-01-03T00:00:00.000Z",
                    updatedAt: "2024-01-04T00:00:00.000Z",
                  },
                },
              },
            },
          },
          {
            request: {
              query: NotesDocument,
              variables: { input: { pageSize: 5 } },
            },
            result: {
              data: {
                notes: {
                  items: [
                    {
                      id: "note-3",
                      title: "Updated note",
                      content: "Updated body",
                      createdAt: "2024-01-03T00:00:00.000Z",
                      updatedAt: "2024-01-04T00:00:00.000Z",
                    },
                  ],
                  pagination: {
                    next: null,
                    previous: null,
                    total: 1,
                  },
                },
              },
            },
          },
          {
            request: {
              query: DeleteNoteDocument,
              variables: { id: "note-3" },
            },
            result: {
              data: {
                deleteNote: {
                  code: 200,
                  success: true,
                  message: "note deleted",
                },
              },
            },
          },
          {
            request: {
              query: NotesDocument,
              variables: { input: { pageSize: 5 } },
            },
            result: {
              data: {
                notes: {
                  items: [],
                  pagination: {
                    next: null,
                    previous: null,
                    total: 0,
                  },
                },
              },
            },
          },
        ]}
      >
        <NotesWorkspace
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          token="token-1"
        />
      </MockedProvider>
    );

    expect(await screen.findByText("user@example.com")).toBeInTheDocument();
    expect(await screen.findByText("First note")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByText("Second note")).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("Title"));
    await userEvent.type(screen.getByLabelText("Title"), "Created note");
    await userEvent.clear(screen.getByLabelText("Content"));
    await userEvent.type(screen.getByLabelText("Content"), "Created body");
    await userEvent.click(screen.getByRole("button", { name: "Create note" }));
    expect(await screen.findByText("Created note")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Edit note" }));
    const dialog = await screen.findByRole("dialog");
    const titleInput = within(dialog).getByDisplayValue("Created note");
    const contentInput = within(dialog).getByDisplayValue("Created body");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Updated note");
    await userEvent.clear(contentInput);
    await userEvent.type(contentInput, "Updated body");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Updated note")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Delete note" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("No notes yet")).toBeInTheDocument();
  });
});
