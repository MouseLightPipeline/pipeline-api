export type MutationOutput<T> = {
    source: T;
    error: string | null;
}

export type ArchiveMutationOutput = {
    id: string;
    error: string | null;
}
