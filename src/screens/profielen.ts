// Profielen (blok 5): "Wie speelt er?" en een profiel maken of aanpassen (figuur + naam).
// Geen wachtwoord: iedereen van het gezin ziet dezelfde inhoud, met eigen instrument, zangbereik en (later) voortgang.

import { hashFor } from '../app/router';
import { allProfiles, activeProfile, removeProfile, saveProfile, setActiveProfile } from '../app/state';
import { MAX_NAME, cleanName } from '../app/profile';
import { CHARACTERS, avatarSvg, type CharacterId } from '../ui/avatar';
import { el } from '../ui/dom';

/** Welk profiel wordt aangepast (null = nieuw). Gezet door het keuzescherm vlak voor het openen van de editor. */
let editTarget: string | null = null;

const goHome = (): void => location.replace(hashFor('start'));

export function mountProfileChooser(app: HTMLElement): void {
  let editing = false;
  const grid = el('div', 'profile-grid');
  const tools = el('div', 'pad-row profile-tools');
  const editBtn = el('button', 'pad wide', 'Profielen aanpassen');
  tools.append(editBtn);

  const render = (): void => {
    grid.replaceChildren();
    for (const p of allProfiles()) {
      const card = el('button', 'profile-card');
      card.dataset.profile = p.id;
      if (p.id === activeProfile()?.id) card.classList.add('current');
      card.append(avatarSvg(p.instrument, { character: p.character, glow: false }), el('span', 'profile-name', p.name));
      if (editing) card.append(el('span', 'profile-edit', 'Aanpassen'));
      card.addEventListener('click', () => {
        if (editing) {
          editTarget = p.id;
          location.hash = hashFor('profiel');
          return;
        }
        void setActiveProfile(p.id).then(goHome);
      });
      grid.append(card);
    }
    const add = el('button', 'profile-card add');
    add.dataset.profile = 'nieuw';
    add.append(el('span', 'profile-plus', '+'), el('span', 'profile-name', 'Nieuw profiel'));
    add.addEventListener('click', () => {
      editTarget = null;
      location.hash = hashFor('profiel');
    });
    grid.append(add);
    editBtn.textContent = editing ? 'Klaar met aanpassen' : 'Profielen aanpassen';
  };
  editBtn.addEventListener('click', () => {
    editing = !editing;
    render();
  });
  render();
  app.append(grid, tools);
}

export function mountProfileEditor(app: HTMLElement): void {
  const existing = allProfiles().find((p) => p.id === editTarget) ?? null;
  let character: CharacterId = existing?.character ?? CHARACTERS[allProfiles().length % CHARACTERS.length].id;

  const nameCard = el('section', 'card');
  const label = el('label', 'field-label', 'Hoe heet je?');
  label.htmlFor = 'profile-name';
  const input = el('input', 'name-input');
  input.id = 'profile-name';
  input.type = 'text';
  input.maxLength = MAX_NAME;
  input.autocomplete = 'off';
  input.setAttribute('autocapitalize', 'words');
  input.value = existing?.name ?? '';
  nameCard.append(label, input);

  const pickCard = el('section', 'card');
  pickCard.append(el('h2', '', 'Kies je figuur'));
  const picks = el('div', 'avatar-picks');
  picks.setAttribute('role', 'radiogroup');
  picks.setAttribute('aria-label', 'Kies je figuur');
  const renderPicks = (): void => {
    picks.replaceChildren();
    for (const c of CHARACTERS) {
      const b = el('button', c.id === character ? 'avatar-pick on' : 'avatar-pick');
      b.dataset.character = c.id;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(c.id === character));
      b.append(avatarSvg(existing?.instrument ?? 'keyboard', { character: c.id, glow: false }), el('span', 'profile-name', c.name));
      b.addEventListener('click', () => {
        character = c.id;
        renderPicks();
      });
      picks.append(b);
    }
  };
  renderPicks();
  pickCard.append(picks);

  const actions = el('div', 'pad-row');
  const done = el('button', 'big', existing ? 'Bewaren' : 'Klaar, laat maar komen!');
  const status = el('p', 'small', '');
  const update = (): void => {
    done.disabled = cleanName(input.value) === '';
  };
  input.addEventListener('input', update);
  update();
  done.addEventListener('click', () => {
    const name = cleanName(input.value);
    if (!name) return;
    done.disabled = true;
    saveProfile({ id: existing?.id, name, character })
      .then((p) => setActiveProfile(p.id))
      .then(goHome)
      .catch(() => {
        done.disabled = false;
        status.textContent = 'Kon het profiel niet bewaren op deze tablet. Probeer opnieuw.';
      });
  });
  actions.append(done);
  app.append(nameCard, pickCard, actions, status);

  if (existing) {
    const del = el('button', 'pad wide danger', 'Profiel verwijderen');
    let armed = false;
    del.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        del.textContent = `Zeker? Tik nog eens om ${existing.name} te verwijderen`;
        window.setTimeout(() => {
          armed = false;
          del.textContent = 'Profiel verwijderen';
        }, 4000);
        return;
      }
      void removeProfile(existing.id).then(() => location.replace(hashFor(allProfiles().length ? 'profielen' : 'profiel')));
    });
    const delRow = el('div', 'pad-row profile-delete');
    delRow.append(del);
    app.append(delRow);
  } else {
    window.setTimeout(() => input.focus(), 50);
  }
}
