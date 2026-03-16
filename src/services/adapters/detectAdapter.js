export const normalizeJob = (src) => {
  if (!src) return null;
  const nested = src.job || {};
  const id = src.ID || src.id || src.jobId || nested.ID || nested.id || nested.jobId || null;
  let status = (src.Status || src.status || src.state || nested.Status || nested.status || nested.state || '').toLowerCase();
  if (!status) {
    if (src.done === true || nested.done === true) status = 'completed'; else status = 'running';
  }
  if (status === 'success') status = 'completed';
  if (status === 'error') status = 'failed';
  if (status === 'cancelled') status = 'canceled';
  const percent = src.percent ?? src.percentage ?? nested.percent ?? nested.percentage;
  let progress = src.Progress ?? src.progress ?? nested.Progress ?? nested.progress ?? 0;
  let total = src.Total ?? src.total ?? nested.Total ?? nested.total ?? 0;
  if ((percent != null) && (!total || Number(total) === 0)) {
    total = 100;
    progress = percent;
  }
  const message = src.Message || src.message || nested.Message || nested.message || '';
  return {
    ID: id,
    Status: status || 'running',
    Progress: Number(progress) || 0,
    Total: Number(total) || 0,
    Message: String(message || '')
  };
};

export const normalizeDetections = (raw) => {
  let commonTime = null;
  if (raw && !Array.isArray(raw) && typeof raw === 'object') {
    commonTime = raw.updatedAt || raw.timestamp || raw.time || raw.CreatedAt || raw.UpdatedAt || raw.created_at || raw.updated_at || null;
  }

  let top = [];
  try {
    if (Array.isArray(raw)) {
      top = raw;
    } else if (raw && Array.isArray(raw.detections)) {
      top = raw.detections;
    } else if (raw && Array.isArray(raw.results)) {
      top = raw.results;
    } else if (raw && Array.isArray(raw.data)) {
      top = raw.data;
    } else if (raw && raw.detection && Array.isArray(raw.detection)) {
      top = raw.detection;
    } else {
      top = [];
    }
  } catch (_) {
    top = [];
  }

  const baseItems = [];
  for (const det of (top || [])) {
    const detTime = det.updatedAt || det.timestamp || det.time || det.CreatedAt || det.UpdatedAt || det.created_at || det.updated_at || commonTime;
    if (det && Array.isArray(det.items) && det.items.length > 0) {
      for (const it of det.items) {
        baseItems.push({ ...it, _fallbackTime: detTime });
      }
    } else {
      baseItems.push({ ...det, _fallbackTime: detTime });
    }
  }

  return baseItems.map((i) => {
    const bbox = i && i.bbox;
    let x = 0;
    let y = 0;
    let width = 0;
    let height = 0;

    if (Array.isArray(bbox)) {
      x = bbox[0];
      y = bbox[1];
      width = bbox[2];
      height = bbox[3];
    } else if (bbox && typeof bbox === 'object') {
      x = bbox.x ?? bbox.left ?? bbox.minX ?? 0;
      y = bbox.y ?? bbox.top ?? bbox.minY ?? 0;
      width = (bbox.width ?? bbox.w ?? ((bbox.right ?? bbox.maxX ?? 0) - (bbox.left ?? bbox.minX ?? 0)));
      height = (bbox.height ?? bbox.h ?? ((bbox.bottom ?? bbox.maxY ?? 0) - (bbox.top ?? bbox.minY ?? 0)));
    } else {
      x = i.x ?? 0;
      y = i.y ?? 0;
      width = i.width ?? 0;
      height = i.height ?? 0;
    }

    const type = i.class ?? i.type ?? i.label ?? i.category ?? '未知类型';
    let confidence = i.confidence ?? i.score ?? i.probability ?? 0;
    if (confidence > 1) confidence = confidence / 100;

    width = Math.max(0, Number(width) || 0);
    height = Math.max(0, Number(height) || 0);
    x = Math.max(0, Number(x) || 0);
    y = Math.max(0, Number(y) || 0);

    const updatedAt = i.updatedAt || i.timestamp || i.time || i.CreatedAt || i.UpdatedAt || i.created_at || i.updated_at || i._fallbackTime || null;

    return { x, y, width, height, type, confidence, updatedAt };
  });
};
