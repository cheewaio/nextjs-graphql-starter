"use client";

import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
} from "@apollo/client";
import {
  ApolloProvider,
  useMutation,
  useQuery,
} from "@apollo/client/react";
import {
  BookOpenIcon,
  LogInIcon,
  LogOutIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  CreateNoteDocument,
  DeleteNoteDocument,
  LoginDocument,
  type LoginMutation,
  type LoginMutationVariables,
  MeDocument,
  type MeQuery,
  type MeQueryVariables,
  NotesDocument,
  type NotesQueryVariables,
  UpdateNoteDocument,
  type CreateNoteMutation,
  type CreateNoteMutationVariables,
  type DeleteNoteMutation,
  type DeleteNoteMutationVariables,
  type NotesQuery,
  type UpdateNoteMutation,
  type UpdateNoteMutationVariables,
} from "@/generated/graphql";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const tokenStorageKey = "notes.accessToken";
const pageSize = 5;

type Note = NotesQuery["notes"]["items"][number];
type NoteDraft = {
  title: string;
  content: string;
};

function createClient(token: string | null) {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: "/graphql",
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    }),
  });
}

function formatDate(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function NotesApp() {
  const [token, setToken] = useState<string | null>(null);

  const client = useMemo(() => createClient(token), [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(window.localStorage.getItem(tokenStorageKey));
  }, []);

  function saveToken(accessToken: string) {
    window.localStorage.setItem(tokenStorageKey, accessToken);
    setToken(accessToken);
  }

  async function logout() {
    window.localStorage.removeItem(tokenStorageKey);
    setToken(null);
    await client.clearStore();
  }

  return (
    <ApolloProvider client={client}>
      <NotesWorkspace onLogin={saveToken} onLogout={logout} token={token} />
    </ApolloProvider>
  );
}

export function NotesWorkspace({
  onLogin,
  onLogout,
  token,
}: {
  onLogin: (token: string) => void;
  onLogout: () => void;
  token: string | null;
}) {
  const me = useQuery<MeQuery, MeQueryVariables>(MeDocument, { skip: !token });
  const notes = useQuery<NotesQuery, NotesQueryVariables>(NotesDocument, {
    skip: !token,
    variables: { input: { pageSize } },
    notifyOnNetworkStatusChange: true,
  });
  const [createNote, createState] = useMutation<
    CreateNoteMutation,
    CreateNoteMutationVariables
  >(CreateNoteDocument, {
    refetchQueries: [NotesDocument],
  });
  const [deleteNote] = useMutation<
    DeleteNoteMutation,
    DeleteNoteMutationVariables
  >(DeleteNoteDocument, {
    refetchQueries: [NotesDocument],
  });
  const [updateNote] = useMutation<
    UpdateNoteMutation,
    UpdateNoteMutationVariables
  >(UpdateNoteDocument, {
    refetchQueries: [NotesDocument],
  });

  async function handleCreate(input: NoteDraft) {
    try {
      const result = await createNote({ variables: { input } });

      if (!result.data?.createNote.success) {
        throw new Error(result.data?.createNote.message ?? "Unable to create note.");
      }

      toast.success(result.data.createNote.message ?? "Note created");
    } catch (error) {
      toast.error(getMessage(error));
    }
  }

  async function handleDelete(id: string) {
    try {
      const result = await deleteNote({ variables: { id } });

      if (!result.data?.deleteNote.success) {
        throw new Error(result.data?.deleteNote.message ?? "Unable to delete note.");
      }

      toast.success(result.data.deleteNote.message ?? "Note deleted");
    } catch (error) {
      toast.error(getMessage(error));
    }
  }

  async function handleUpdate(
    id: string,
    input: NoteDraft
  ) {
    try {
      const result = await updateNote({ variables: { id, input } });

      if (!result.data?.updateNote.success) {
        throw new Error(result.data?.updateNote.message ?? "Unable to update note.");
      }

      toast.success(result.data.updateNote.message ?? "Note updated");
    } catch (error) {
      toast.error(getMessage(error));
    }
  }

  const pagination = notes.data?.notes.pagination;
  const noteList = notes.data?.notes.items ?? [];
  const username = me.data?.me.username;

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-primary">
              GraphQL Notes
            </h1>
            <p className="text-sm text-muted-foreground">
              CRUD, cursor pagination, codegen, and JWT auth in one starter.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {username ? (
              <Badge variant="secondary">{username}</Badge>
            ) : null}
            {token ? (
              <Button variant="outline" onClick={onLogout}>
                <LogOutIcon data-icon="inline-start" />
                Logout
              </Button>
            ) : (
              <LoginDialog onLogin={onLogin} />
            )}
          </div>
        </header>

        {token ? (
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>New note</CardTitle>
                <CardDescription>
                  Create a note through the protected GraphQL API.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NoteForm
                  buttonLabel="Create note"
                  isPending={createState.loading}
                  onSubmit={handleCreate}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
                <CardDescription>
                  Newest notes first, loaded with cursor pagination.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NoteList
                  error={notes.error}
                  isLoading={notes.loading && !notes.data}
                  notes={noteList}
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
                />
              </CardContent>
              <CardFooter className="justify-between">
                <p className="text-sm text-muted-foreground">
                  {noteList.length} loaded
                </p>
                <Button
                  disabled={!pagination?.next || notes.loading}
                  onClick={() =>
                    notes.fetchMore({
                      variables: {
                        input: {
                          pageSize,
                          cursor:
                            pagination?.next && "cursor" in pagination.next
                              ? pagination.next.cursor
                              : undefined,
                        },
                      },
                      updateQuery: (previous, { fetchMoreResult }) => {
                        if (!fetchMoreResult) {
                          return previous;
                        }

                        return {
                          notes: {
                            ...fetchMoreResult.notes,
                            items: [
                              ...previous.notes.items,
                              ...fetchMoreResult.notes.items,
                            ],
                          },
                        };
                      },
                    })
                  }
                  variant="outline"
                >
                  Load more
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          <Empty className="min-h-[420px] border bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="text-primary bg-primary/10">
                <BookOpenIcon />
              </EmptyMedia>
              <EmptyTitle>Login to manage notes</EmptyTitle>
              <EmptyDescription>
                Use any username to receive a demo JWT access token.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <LoginDialog onLogin={onLogin} />
            </EmptyContent>
          </Empty>
        )}
      </div>
    </main>
  );
}

function LoginDialog({ onLogin }: { onLogin: (token: string) => void }) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("user@example.com");
  const [login, state] = useMutation<LoginMutation, LoginMutationVariables>(
    LoginDocument
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const result = await login({ variables: { username } });
      const accessToken = result.data?.login.accessToken;

      if (!result.data?.login.success || !accessToken) {
        throw new Error(
          result.data?.login.message ?? "Login did not return an access token."
        );
      }

      onLogin(accessToken);
      setOpen(false);
      toast.success(result.data.login.message ?? "Logged in");
    } catch (error) {
      toast.error(getMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <LogInIcon data-icon="inline-start" />
          Login
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Login</DialogTitle>
            <DialogDescription>
              Enter a username to generate a demo JWT access token.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="username">Username</FieldLabel>
              <Input
                id="username"
                onChange={(event) => setUsername(event.target.value)}
                required
                type="email"
                value={username}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button disabled={state.loading} type="submit">
              Generate token
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NoteForm({
  buttonLabel,
  initialContent = "",
  initialTitle = "",
  isPending,
  onSubmit,
  resetOnSubmit = true,
}: {
  buttonLabel: string;
  initialContent?: string;
  initialTitle?: string;
  isPending?: boolean;
  onSubmit: (input: NoteDraft) => Promise<void>;
  resetOnSubmit?: boolean;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({ title, content });

    if (resetOnSubmit) {
      setTitle("");
      setContent("");
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="note-title">Title</FieldLabel>
          <Input
            id="note-title"
            onChange={(event) => setTitle(event.target.value)}
            required
            value={title}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="note-content">Content</FieldLabel>
          <Textarea
            id="note-content"
            onChange={(event) => setContent(event.target.value)}
            required
            rows={5}
            value={content}
          />
        </Field>
      </FieldGroup>
      <Button disabled={isPending} type="submit">
        <PlusIcon data-icon="inline-start" />
        {buttonLabel}
      </Button>
    </form>
  );
}

function NoteList({
  error,
  isLoading,
  notes,
  onDelete,
  onUpdate,
}: {
  error?: Error;
  isLoading: boolean;
  notes: Note[];
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, input: NoteDraft) => Promise<void>;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Empty className="min-h-[260px]">
        <EmptyHeader>
          <EmptyTitle>Unable to load notes</EmptyTitle>
          <EmptyDescription>{error.message}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (notes.length === 0) {
    return (
      <Empty className="min-h-[260px]">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="text-primary bg-primary/10">
            <BookOpenIcon />
          </EmptyMedia>
          <EmptyTitle>No notes yet</EmptyTitle>
          <EmptyDescription>Create your first note to see it here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {notes.map((note) => (
        <article
          className="flex flex-col gap-4 rounded-xl border bg-card p-4"
          key={note.id}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-base font-medium">{note.title}</h2>
              <p className="text-xs text-muted-foreground">
                Updated {formatDate(note.updatedAt)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <EditNoteDialog note={note} onUpdate={onUpdate} />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon-sm" variant="ghost">
                    <Trash2Icon />
                    <span className="sr-only">Delete note</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete note?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes {note.title}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(note.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {note.content}
          </p>
        </article>
      ))}
    </div>
  );
}

function EditNoteDialog({
  note,
  onUpdate,
}: {
  note: Note;
  onUpdate: (id: string, input: NoteDraft) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(input: { title: string; content: string }) {
    await onUpdate(note.id, input);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon-sm" variant="ghost">
          <PencilIcon />
          <span className="sr-only">Edit note</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit note</DialogTitle>
          <DialogDescription>
            Update this note through the protected GraphQL API.
          </DialogDescription>
        </DialogHeader>
        <NoteForm
          buttonLabel="Save changes"
          initialContent={note.content}
          initialTitle={note.title}
          onSubmit={handleSubmit}
          resetOnSubmit={false}
        />
      </DialogContent>
    </Dialog>
  );
}
