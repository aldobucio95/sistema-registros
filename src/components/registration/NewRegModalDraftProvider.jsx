import React, { useEffect, useRef, useState } from 'react';

/**
 * Borrador local del modal «Nuevo registro»: evita re-renderizar App/roster en cada tecla.
 * Persiste en localStorage vía callback; el padre solo recibe flush explícito al cerrar o enviar.
 */
export function NewRegModalDraftProvider({
  seedEntry,
  seedProfileSearch = '',
  resetToken,
  persistDraft,
  buildCompanionCollisionHint,
  buildProfileImportMatches,
  draftLiveRef,
  profileSearchLiveRef,
  children,
}) {
  const [draft, setDraft] = useState(seedEntry);
  const [profileSearch, setProfileSearch] = useState(seedProfileSearch);
  const [companionCollisionHint, setCompanionCollisionHint] = useState(null);
  const [profileImportMatches, setProfileImportMatches] = useState([]);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const profileSearchRef = useRef(profileSearch);
  profileSearchRef.current = profileSearch;

  useEffect(() => {
    if (draftLiveRef) draftLiveRef.current = draft;
  }, [draft, draftLiveRef]);

  useEffect(() => {
    if (profileSearchLiveRef) profileSearchLiveRef.current = profileSearch;
  }, [profileSearch, profileSearchLiveRef]);

  useEffect(() => {
    setDraft(seedEntry);
    draftRef.current = seedEntry;
    setProfileSearch(seedProfileSearch ?? '');
    profileSearchRef.current = seedProfileSearch ?? '';
    setProfileImportMatches([]);
  }, [resetToken, seedEntry, seedProfileSearch]);

  useEffect(() => {
    if (!persistDraft) return undefined;
    const t = window.setTimeout(
      () => persistDraft(draftRef.current, profileSearchRef.current),
      450
    );
    return () => window.clearTimeout(t);
  }, [draft, profileSearch, persistDraft]);

  useEffect(() => {
    if (!buildCompanionCollisionHint || !draft.name?.trim()) {
      setCompanionCollisionHint(null);
      return undefined;
    }
    const t = window.setTimeout(() => {
      setCompanionCollisionHint(buildCompanionCollisionHint(draft.name, draft.birthDate));
    }, 350);
    return () => window.clearTimeout(t);
  }, [draft.name, draft.birthDate, buildCompanionCollisionHint]);

  useEffect(() => {
    if (!buildProfileImportMatches) {
      setProfileImportMatches([]);
      return undefined;
    }
    const t = window.setTimeout(() => {
      setProfileImportMatches(buildProfileImportMatches(profileSearch));
    }, 300);
    return () => window.clearTimeout(t);
  }, [profileSearch, buildProfileImportMatches]);

  return children({
    draft,
    setDraft,
    draftRef,
    profileSearch,
    setProfileSearch,
    profileImportMatches,
    companionCollisionHint,
  });
}
