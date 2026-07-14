import { isSiValue } from '../../publicRegistrationLogic.js';

/** Teens | Jóvenes si servidor Ambos eligió precio mixto; cadena vacía si tarifa única o no aplica. */
export const getAmbosServeInSegmentOrEmpty = (personLike) => {
  const mix = String(personLike?.ambosServeInSegment || '').trim();
  return mix === 'Teens' || mix === 'Jóvenes' ? mix : '';
};

/** Campaña de descuento aplica al perfil servidor/campista del registro. */
export const campaignMatchesPersonProfile = (c, personLike) => {
  const isAnyServerAmbos =
    isSiValue(personLike?.isServer) && String(personLike?.serverAssignment || '').trim() === 'Ambos';
  const isServerAmbosTarifaUnica = isAnyServerAmbos && !getAmbosServeInSegmentOrEmpty(personLike);
  const appliesTo = c?.appliesTo || 'all';
  if (appliesTo === 'server_ambos') return isServerAmbosTarifaUnica;
  if (appliesTo === 'general') return !isAnyServerAmbos;
  return true;
};

export const isDiscountCampaignVigenteOnDate = (c, dayIso) => {
  if (!c?.startDate || !c?.endDate || !dayIso) return false;
  return c.startDate <= dayIso && dayIso <= c.endDate;
};

/** Inicio y fin definidos; puede activarse sola por calendario (vigencia). Si falta alguna, solo manual (alta/edición). */
export const discountCampaignHasDateRange = (c) =>
  !!(c?.startDate && String(c.startDate).trim() && c?.endDate && String(c.endDate).trim());

export const isValidDiscountCampaignRow = (c) =>
  !!(
    c &&
    c.enabled !== false &&
    String(c.concept || '').trim() &&
    (Number(c.finalAmount) || 0) > 0
  );

export const getValidDiscountCampaignsForPerson = (eventLike, personLike) => {
  const all = Array.isArray(eventLike?.discountCampaigns) ? eventLike.discountCampaigns : [];
  return all.filter((c) => isValidDiscountCampaignRow(c) && campaignMatchesPersonProfile(c, personLike));
};

export const discountCampaignAppliesToLabel = (c) => {
  const a = c?.appliesTo || 'all';
  if (a === 'server_ambos') return 'Solo servidor Ambos (tarifa única)';
  if (a === 'general') return 'Campistas y servidores no-Ambos';
  return 'Todos los perfiles';
};

export const findDiscountCampaignById = (eventLike, id) => {
  if (id == null || id === '') return null;
  const all = Array.isArray(eventLike?.discountCampaigns) ? eventLike.discountCampaigns : [];
  return all.find((x) => String(x.id) === String(id)) || null;
};
