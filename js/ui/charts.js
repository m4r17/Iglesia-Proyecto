App.Charts = (function () {
  const palette = ['#2f5d8a', '#c8a24a', '#1f8a5b', '#6d5bb8', '#127c78', '#c0432f'];

  function prepare(canvas, height) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width || canvas.parentElement.clientWidth || 520, 260);
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    return { ctx, width, height };
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function truncate(ctx, text, maxWidth) {
    let value = String(text || '');
    if (ctx.measureText(value).width <= maxWidth) return value;
    while (value.length > 1 && ctx.measureText(`${value}…`).width > maxWidth) {
      value = value.slice(0, -1);
    }
    return `${value}…`;
  }

  function noData(ctx, width, height) {
    ctx.fillStyle = '#8a96a8';
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Sin datos registrados', width / 2, height / 2);
  }

  function bar(canvas, labels, values, options) {
    if (!canvas) return;

    const opts = options || {};
    const format = opts.formatter || ((value) => String(value));
    const { ctx, width, height } = prepare(canvas, 220);
    const hasData = values.some((value) => Number(value) > 0);

    if (!hasData) {
      noData(ctx, width, height);
      return;
    }

    const padding = { top: 24, right: 14, bottom: 42, left: 46 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const maxValue = Math.max(...values, 1);
    const step = Math.max(Math.ceil(maxValue / 4), 1);
    const niceMax = step * 4;

    ctx.font = '11px system-ui, sans-serif';
    ctx.textBaseline = 'middle';

    for (let index = 0; index <= 4; index += 1) {
      const value = (niceMax / 4) * index;
      const y = padding.top + chartHeight - (value / niceMax) * chartHeight;

      ctx.strokeStyle = '#edf1f6';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#8a96a8';
      ctx.textAlign = 'right';
      ctx.fillText(format(Math.round(value)), padding.left - 8, y);
    }

    const slot = chartWidth / values.length;
    const barWidth = Math.min(slot * 0.56, 54);

    values.forEach((value, index) => {
      const barHeight = (Number(value) / niceMax) * chartHeight;
      const x = padding.left + slot * index + (slot - barWidth) / 2;
      const y = padding.top + chartHeight - barHeight;

      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      gradient.addColorStop(0, '#3f74a8');
      gradient.addColorStop(1, '#2f5d8a');

      ctx.fillStyle = gradient;
      roundRect(ctx, x, y, barWidth, Math.max(barHeight, 2), 6);
      ctx.fill();

      ctx.fillStyle = '#46536a';
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(format(Number(value)), x + barWidth / 2, y - 10);

      ctx.fillStyle = '#6b7787';
      ctx.font = '10.5px system-ui, sans-serif';
      const label = truncate(ctx, labels[index], slot - 6);
      ctx.fillText(label, x + barWidth / 2, height - padding.bottom + 16);
    });
  }

  function donut(canvas, segments, options) {
    if (!canvas) return;

    const opts = options || {};
    const format = opts.formatter || ((value) => String(value));
    const { ctx, width, height } = prepare(canvas, 220);
    const data = (segments || []).filter((segment) => Number(segment.value) > 0);
    const total = data.reduce((sum, segment) => sum + Number(segment.value), 0);

    if (!total) {
      noData(ctx, width, height);
      return;
    }

    const compact = width < 430;
    const radius = compact ? Math.min(width, height) * 0.26 : Math.min(height, width) * 0.4;
    const centerX = compact ? width / 2 : radius + 30;
    const centerY = compact ? height * 0.42 : height / 2;
    const lineWidth = Math.max(radius * 0.42, 14);

    let startAngle = -Math.PI / 2;

    data.forEach((segment, index) => {
      const angle = (Number(segment.value) / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.strokeStyle = segment.color || palette[index % palette.length];
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'butt';
      ctx.arc(centerX, centerY, radius - lineWidth / 2, startAngle, startAngle + angle);
      ctx.stroke();
      startAngle += angle;
    });

    ctx.fillStyle = '#1b2432';
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(format(total), centerX, centerY - 6);

    ctx.fillStyle = '#8a96a8';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('total', centerX, centerY + 15);

    const legendX = compact ? 24 : centerX + radius + 26;
    let legendY = compact ? height - 50 : centerY - ((data.length * 24) / 2) + 6;

    data.forEach((segment, index) => {
      const color = segment.color || palette[index % palette.length];
      const value = Number(segment.value);
      const percent = Math.round((value / total) * 100);

      ctx.fillStyle = color;
      roundRect(ctx, legendX, legendY - 5, 10, 10, 3);
      ctx.fill();

      ctx.fillStyle = '#46536a';
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${segment.label} · ${format(value)} (${percent}%)`, legendX + 18, legendY);

      legendY += 24;
    });
  }

  return { bar, donut, palette };
})();
