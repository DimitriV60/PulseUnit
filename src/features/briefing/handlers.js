/**
 * Briefing vocal de début de garde — utilise Web Speech API (gratuit, offline).
 *
 * Compose un résumé textuel à partir de l'état courant (shift, lits occupés,
 * tâches restantes, messages non-lus, mes notes de lit) et le lit en synthèse
 * vocale française (voice 'fr-FR' si dispo).
 *
 * Expose sur window :
 *   - composeBriefing()  — renvoie le texte complet du briefing
 *   - playBriefing()     — lance la lecture vocale
 *   - stopBriefing()     — interrompt la lecture
 *   - toggleBriefing()   — play/stop selon l'état
 *
 * Coût : 0 (Web Speech API, intégrée au navigateur).
 */

(function () {
    'use strict';

    let _utterance = null;
    let _isPlaying = false;

    function _shiftLabel() {
        if (!currentShiftKey) return 'aucune garde sélectionnée';
        const parts = currentShiftKey.split('-');
        if (parts.length < 4) return currentShiftKey;
        const [yyyy, mm, dd, type] = parts;
        const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
        const monthName = months[parseInt(mm, 10) - 1] || mm;
        return `${type === 'jour' ? 'Garde de jour' : 'Garde de nuit'} du ${parseInt(dd, 10)} ${monthName}`;
    }

    function _countOccupiedBeds() {
        const result = { rea: 0, usip: 0, totalBeds: 0 };
        if (!window.shiftHistory || !currentShiftKey) return result;
        const h = window.shiftHistory[currentShiftKey] || {};
        const assignments = h.assignments || {};
        (window.CONFIG || []).forEach(zone => {
            zone.beds.forEach(n => {
                result.totalBeds++;
                const id = `${zone.type}-${n}`;
                const a = assignments[id];
                // Considéré "occupé" si un patient/intitulé est saisi (champ 'patient' ou 'closed' = false)
                const occupied = a && !a.closed && (a.patient || a.med || a.ide || a.as);
                if (occupied) {
                    if (zone.type === 'rea') result.rea++;
                    else if (zone.type === 'usip') result.usip++;
                }
            });
        });
        return result;
    }

    function _myAssignedBeds() {
        if (!currentUser || !window.shiftHistory || !currentShiftKey) return [];
        const h = window.shiftHistory[currentShiftKey] || {};
        const assignments = h.assignments || {};
        const out = [];
        Object.entries(assignments).forEach(([bedId, a]) => {
            if (!a || a.closed) return;
            if (a.ide === currentUser.id || a.as === currentUser.id || a.med === currentUser.id) {
                const [type, n] = bedId.split('-');
                out.push(`${type === 'rea' ? 'Réa' : 'USIP'} ${n}`);
            }
        });
        return out;
    }

    function _myUnreadMessages() {
        if (typeof window.totalUnreadMessages === 'function') {
            return window.totalUnreadMessages();
        }
        return 0;
    }

    function _myBedNotes() {
        if (!currentUser || !window.bedNotesData) return [];
        const userNotes = window.bedNotesData[currentUser.id] || {};
        const notes = [];
        Object.entries(userNotes).forEach(([bedId, slots]) => {
            if (!slots) return;
            const arr = Array.isArray(slots) ? slots : Object.values(slots);
            arr.forEach(slot => {
                if (slot && slot.text && slot.text.trim()) {
                    notes.push({ bedId, text: slot.text.trim().slice(0, 80) });
                }
            });
        });
        return notes.slice(0, 5);
    }

    window.composeBriefing = function composeBriefing() {
        const lines = [];
        const fn = (currentUser && currentUser.firstName) ? currentUser.firstName : '';
        const role = (currentUser && currentUser.role) ? currentUser.role.toUpperCase() : '';
        lines.push(`Bonjour ${fn}.`);
        lines.push(`${_shiftLabel()}.`);
        if (role) lines.push(`Rôle : ${role}.`);

        const beds = _countOccupiedBeds();
        if (beds.totalBeds > 0) {
            lines.push(`Occupation des lits : ${beds.rea} en réanimation, ${beds.usip} en U.S.I.P.`);
        }

        const myBeds = _myAssignedBeds();
        if (myBeds.length > 0) {
            lines.push(`Lits qui te sont assignés : ${myBeds.join(', ')}.`);
        }

        const unread = _myUnreadMessages();
        if (unread > 0) {
            lines.push(`Tu as ${unread} message${unread > 1 ? 's non lus' : ' non lu'} en messagerie.`);
        }

        const notes = _myBedNotes();
        if (notes.length > 0) {
            lines.push(`Tes notes de lit en cours :`);
            notes.forEach(n => {
                const [type, num] = n.bedId.split('-');
                lines.push(`${type === 'rea' ? 'Réa' : 'U.S.I.P.'} ${num} : ${n.text}.`);
            });
        }

        lines.push('Bonne garde.');
        return lines.join(' ');
    };

    function _pickFrenchVoice() {
        if (!('speechSynthesis' in window)) return null;
        const voices = window.speechSynthesis.getVoices();
        if (!voices || !voices.length) return null;
        return voices.find(v => /fr[-_]FR/i.test(v.lang)) ||
               voices.find(v => /^fr/i.test(v.lang)) || null;
    }

    window.playBriefing = function playBriefing() {
        if (!('speechSynthesis' in window)) {
            if (typeof showToast === 'function') showToast('🔇 Synthèse vocale indisponible sur ce navigateur');
            return;
        }
        const text = window.composeBriefing();
        if (!text) return;
        try { window.speechSynthesis.cancel(); } catch (e) {}
        _utterance = new SpeechSynthesisUtterance(text);
        const v = _pickFrenchVoice();
        if (v) _utterance.voice = v;
        _utterance.lang = 'fr-FR';
        _utterance.rate = 1.0;
        _utterance.pitch = 1.0;
        _utterance.volume = 1.0;
        _utterance.onstart = () => { _isPlaying = true; _updateBriefingBtn(); };
        _utterance.onend = _utterance.onerror = () => { _isPlaying = false; _updateBriefingBtn(); };
        window.speechSynthesis.speak(_utterance);
    };

    window.stopBriefing = function stopBriefing() {
        if (!('speechSynthesis' in window)) return;
        try { window.speechSynthesis.cancel(); } catch (e) {}
        _isPlaying = false;
        _updateBriefingBtn();
    };

    window.toggleBriefing = function toggleBriefing() {
        if (_isPlaying) window.stopBriefing();
        else window.playBriefing();
    };

    function _updateBriefingBtn() {
        const btn = document.getElementById('briefing-btn');
        if (!btn) return;
        btn.textContent = _isPlaying ? '⏹ Arrêter' : '🔊 Briefing';
        btn.style.background = _isPlaying ? 'var(--crit)' : 'var(--brand-aqua)';
    }

    // Charger les voix dès qu'elles sont disponibles (Chrome charge en async)
    if ('speechSynthesis' in window) {
        try { window.speechSynthesis.onvoiceschanged = () => {}; } catch (e) {}
    }
})();
