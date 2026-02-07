/**
 * GameSceneTicketBar - Order ticket display and updates
 */
import { INGREDIENTS, TREATMENTS } from '../data/ingredients.js';
import { soundManager } from '../SoundManager.js';

export class GameSceneTicketBar {
  constructor(scene) {
    this.scene = scene;
  }

  create() {
    const s = this.scene;

    s.add.rectangle(512, 95, 1024, 88, s.HULL_MID).setDepth(35);
    s.add.rectangle(512, 52, 1024, 2, s.HULL_LIGHT).setDepth(35);
    s.add.rectangle(512, 138, 1024, 2, s.HULL_LIGHT).setDepth(35);

    const ticketLip = s.add.graphics().setDepth(35);
    ticketLip.fillStyle(s.HULL_DARK, 1);
    ticketLip.fillRect(0, 139, 1024, 4);
    ticketLip.fillStyle(s.HULL_LIGHT, 1);
    ticketLip.beginPath();
    ticketLip.moveTo(0, 139);
    ticketLip.lineTo(1024, 139);
    ticketLip.lineTo(1024 + 3, 143);
    ticketLip.lineTo(3, 143);
    ticketLip.closePath();
    ticketLip.fillPath();
    ticketLip.fillStyle(s.NEON_PINK, 0.3);
    ticketLip.fillRect(0, 139, 1024, 1);

    s.add.text(8, 55, 'ORDERS:', {
      fontSize: '10px', color: '#00bbdd', fontFamily: 'Arial', fontStyle: 'bold',
    }).setDepth(36);

    s.ticketContainer = s.add.container(0, 0).setDepth(36);
  }

  addTicket(order, orderNum) {
    const s = this.scene;
    const handFonts = ['Caveat, cursive', 'Permanent Marker, cursive', 'Nothing You Could Do, cursive', 'Grape Nuts, cursive'];
    const ticketFont = handFonts[Math.floor(Math.random() * handFonts.length)];
    const cardW = 140;
    const lineH = 13;
    const ingLines = order.ingredients.length;
    const treatLines = order.treatments ? order.treatments.length : 0;
    const footerLine = 0;
    const contentH = 22 + footerLine + ingLines * lineH + (treatLines > 0 ? 10 + treatLines * lineH : 0);
    const cardH = Math.max(90, contentH + 8);
    const overlapStep = 100;
    const targetX = 65 + (orderNum - 1) * overlapStep;
    const targetY = 55;
    const cardDepth = 36 + orderNum;

    const spawnX = 512;
    const spawnY = 384;

    const card = s.add.container(spawnX, spawnY).setDepth(400);

    const bg = s.add.graphics();
    bg.fillStyle(0xFFFFC0, 1);
    bg.fillRoundedRect(0, 0, cardW, cardH, 5);
    bg.lineStyle(2, 0xDDCC80, 1);
    bg.strokeRoundedRect(0, 0, cardW, cardH, 5);
    card.add(bg);

    const numText = s.add.text(cardW / 2, 4, `#${orderNum}`, {
      fontSize: '14px', color: '#333', fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5, 0);
    card.add(numText);

    let yOff = 20;

    const priceTxt = s.add.text(cardW - 6, 5, `$${order.totalPrice.toFixed(2)}`, {
      fontSize: '11px', color: '#006600', fontFamily: 'Arial', fontStyle: 'bold'
    }).setOrigin(1, 0);
    card.add(priceTxt);

    const div = s.add.graphics();
    div.lineStyle(1, 0xCCBB70, 1);
    div.lineBetween(4, yOff, cardW - 4, yOff);
    card.add(div);

    const entries = [];
    order.ingredients.forEach((key, i) => {
      const ing = INGREDIENTS[key];
      const isTopBread = (i === order.ingredients.length - 1 && key.startsWith('bread_'));
      const displayName = isTopBread ? `${ing.name} \u2191` : ing.name;
      const isNext = (i === 0);
      const txt = s.add.text(10, yOff + 3 + i * lineH, displayName, {
        fontSize: '13px',
        color: isNext ? '#111' : '#999',
        fontFamily: ticketFont,
      });
      card.add(txt);
      entries.push({ key, text: txt, done: false });
    });

    const treatEntries = [];
    if (order.treatments && order.treatments.length > 0) {
      const treatStartY = yOff + 3 + ingLines * lineH + 3;
      const div2 = s.add.graphics();
      div2.lineStyle(1, 0xCC8800, 0.5);
      div2.lineBetween(4, treatStartY, cardW - 4, treatStartY);
      card.add(div2);

      order.treatments.forEach((tKey, i) => {
        const treat = TREATMENTS[tKey];
        const txt = s.add.text(10, treatStartY + 4 + i * lineH, `[${treat.name}]`, {
          fontSize: '13px',
          color: '#cc0000',
          fontFamily: ticketFont,
        });
        card.add(txt);
        treatEntries.push({ key: tKey, text: txt, done: false });
      });
    }

    s.ticketContainer.add(card);

    const ticket = { card, bg, orderNum, entries, treatEntries, cardH, cardW, status: 'active' };
    s.tickets.push(ticket);

    this.animateTicketPopIn(card, targetX, targetY, cardW, cardDepth);

    return ticket;
  }

  animateTicketPopIn(card, targetX, targetY, cardW, cardDepth) {
    const s = this.scene;
    soundManager.waiterGibberish();

    card.setScale(2.5);
    card.setAlpha(0);

    s.tweens.add({
      targets: card,
      alpha: 1,
      scale: 2.0,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        s.time.delayedCall(600, () => {
          s.tweens.add({
            targets: card,
            x: targetX,
            y: targetY,
            scale: 1,
            depth: cardDepth || 36,
            duration: 500,
            ease: 'Power2'
          });
        });
      }
    });

    const rightEdge = targetX + cardW + 10;
    if (rightEdge > 1020) {
      s.tweens.add({
        targets: s.ticketContainer, x: -(rightEdge - 1020),
        duration: 300, ease: 'Power2',
        delay: 1000
      });
    }
  }

  updateTicketIngredient(orderNum, ingredientKey) {
    const s = this.scene;
    const ticket = s.tickets.find((t) => t.orderNum === orderNum);
    if (!ticket) return;
    const entry = ticket.entries.find((e) => e.key === ingredientKey && !e.done);
    if (entry) {
      entry.done = true;
      entry.text.setColor('#0a0');
      entry.text.setFontStyle('bold');
      entry.text.setText('\u2713 ' + INGREDIENTS[ingredientKey].name);
    }
    this.highlightNextIngredient(orderNum);
  }

  highlightNextIngredient(orderNum) {
    const s = this.scene;
    const ticket = s.tickets.find((t) => t.orderNum === orderNum);
    if (!ticket) return;
    let foundNext = false;
    for (const entry of ticket.entries) {
      if (entry.done) continue;
      if (!foundNext) {
        foundNext = true;
        entry.text.setColor('#111');
        entry.text.setFontStyle('bold');
      } else {
        entry.text.setColor('#999');
        entry.text.setFontStyle('normal');
      }
    }
  }

  updateTicketTreatment(orderNum, treatmentKey) {
    const s = this.scene;
    const ticket = s.tickets.find((t) => t.orderNum === orderNum);
    if (!ticket) return;
    const entry = ticket.treatEntries.find((e) => e.key === treatmentKey && !e.done);
    if (entry) {
      entry.done = true;
      entry.text.setColor('#0a0');
      entry.text.setText('\u2713 ' + TREATMENTS[treatmentKey].name);
    }
  }

  markTicketCompleted(orderNum) {
    const s = this.scene;
    const ticket = s.tickets.find((t) => t.orderNum === orderNum);
    if (!ticket) return;
    ticket.status = 'completed';
    const w = ticket.cardW || 140;
    const h = ticket.cardH || 90;
    const overlay = s.add.graphics();
    overlay.fillStyle(0x00ff00, 0.15);
    overlay.fillRoundedRect(0, 0, w, h, 5);
    ticket.card.add(overlay);
    const check = s.add.text(w / 2, h / 2, '\u2713', {
      fontSize: '36px', color: '#0a0', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.6);
    ticket.card.add(check);
  }

  markTicketMissed(orderNum) {
    const s = this.scene;
    const ticket = s.tickets.find((t) => t.orderNum === orderNum);
    if (!ticket) return;
    ticket.status = 'missed';
    const w = ticket.cardW || 140;
    const h = ticket.cardH || 90;
    const overlay = s.add.graphics();
    overlay.fillStyle(0xff0000, 0.2);
    overlay.fillRoundedRect(0, 0, w, h, 5);
    ticket.card.add(overlay);
    const xMark = s.add.text(w / 2, h / 2, '\u2717', {
      fontSize: '36px', color: '#f33', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.6);
    ticket.card.add(xMark);
  }
}
