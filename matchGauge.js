// يُرجع HTML لختم التوافق الدائري. استدعِ mountMatchGauges() بعد إدراج الـ HTML في الصفحة
// لتفعيل حركة الرسم التدريجي (تُحترم فيها prefers-reduced-motion عبر CSS).
function matchGaugeHTML(score, size = 64) {
  const pct = Math.max(0, Math.min(100, score));
  const strength = pct >= 75 ? 'قوي' : pct >= 50 ? 'متوسط' : 'ضعيف';
  const ringColor = pct >= 75 ? '#C9A24B' : pct >= 50 ? '#6E9C8E' : '#5A6478';
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;

  return `
    <div class="gauge" role="img" aria-label="نسبة التوافق ${Math.round(pct)}٪ — ${strength}">
      <div class="gauge-ring" style="width:${size}px;height:${size}px">
        <svg width="${size}" height="${size}" style="transform:rotate(-90deg)">
          <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="#243450" stroke-width="3" />
          <circle class="gauge-progress" cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none"
            stroke="${ringColor}" stroke-width="3" stroke-linecap="round"
            stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}"
            data-target-offset="${circumference - (pct / 100) * circumference}" />
        </svg>
        <span class="gauge-value" style="color:${ringColor}">${Math.round(pct)}</span>
      </div>
      <span class="gauge-label">${strength}</span>
    </div>`;
}

// يُشغّل حركة الرسم التدريجي لكل الأختام الموجودة حاليًا في الصفحة
function mountMatchGauges(container = document) {
  requestAnimationFrame(() => {
    container.querySelectorAll('.gauge-progress').forEach((circle) => {
      circle.style.transition = 'stroke-dashoffset 700ms ease-out';
      circle.setAttribute('stroke-dashoffset', circle.dataset.targetOffset);
    });
  });
}
