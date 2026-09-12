(function (root) {
  function validate(payload, maxRuns = 100) {
    const runs = Array.isArray(payload) ? payload : payload?.runs;
    if (!Array.isArray(runs) || !runs.length || runs.length > maxRuns) throw Error('运行数量超出限制。');
    const seenRuns = new Set();
    const identifier = /^[a-zA-Z0-9_.-]{1,100}$/;
    const text = (value, max) => typeof value === 'string' && value.length > 0 && value.length <= max;
    const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1e9;
    const count = value => number(value) && Number.isInteger(value);
    return runs.map(run => {
      if (!run || typeof run.run_id !== 'string' || !identifier.test(run.run_id) || seenRuns.has(run.run_id)) throw Error('运行 ID 无效或重复。');
      seenRuns.add(run.run_id);
      if (!text(run.workflow, 200) || !text(run.objective, 1000) ||
          !['completed', 'completed_with_warnings', 'failed'].includes(run.status) ||
          typeof run.started_at !== 'string' || !Number.isFinite(Date.parse(run.started_at)) ||
          !/(Z|[+-]\d{2}:\d{2})$/.test(run.started_at)) throw Error('运行元数据或时区无效。');
      if (!Array.isArray(run.steps) || !run.steps.length || run.steps.length > 200) throw Error('每次运行必须包含 1–200 个步骤。');
      if (!['sample', 'measured', 'imported'].includes(run.source ?? 'imported')) throw Error('数据来源无效。');
      const seenSteps = new Set(), timed = run.steps[0].start_ms != null;
      const steps = run.steps.map(step => {
        if (!step || typeof step.id !== 'string' || !identifier.test(step.id) || seenSteps.has(step.id)) throw Error('步骤 ID 无效或重复。');
        seenSteps.add(step.id);
        if (!text(step.name, 200) || !text(step.agent, 200) || !text(step.tool, 200) ||
            !['tool', 'reasoning'].includes(step.type) || !['success', 'failed'].includes(step.status) ||
            !number(step.duration_ms) || (step.start_ms != null) !== timed ||
            (timed && !number(step.start_ms)) || !count(step.retries ?? 0) ||
            (step.tokens_in != null && !count(step.tokens_in)) ||
            (step.tokens_out != null && !count(step.tokens_out)) ||
            (step.cost_usd != null && !number(step.cost_usd)) ||
            typeof (step.notes ?? '') !== 'string' || (step.notes ?? '').length > 4000) throw Error('步骤数值、状态或时间偏移无效。');
        if (run.status === 'completed' && step.status === 'failed') throw Error('成功运行不能包含失败步骤。');
        return { id: step.id, name: step.name, agent: step.agent, tool: step.tool, type: step.type,
          status: step.status, duration_ms: step.duration_ms, start_ms: step.start_ms ?? null,
          retries: step.retries ?? 0, tokens_in: step.tokens_in ?? null, tokens_out: step.tokens_out ?? null,
          cost_usd: step.cost_usd ?? null, notes: step.notes ?? '' };
      });
      return { run_id: run.run_id, workflow: run.workflow, objective: run.objective, status: run.status,
        started_at: run.started_at, source: run.source ?? 'imported', steps };
    });
  }

  function timing(run) {
    let elapsed = 0;
    const timeline = run.steps.map(step => {
      const start = step.start_ms ?? elapsed, end = start + step.duration_ms;
      elapsed = Math.max(elapsed, end);
      return { ...step, start_ms: start, end_ms: end };
    });
    return { timeline, total: elapsed, work: run.steps.reduce((sum, step) => sum + step.duration_ms, 0) };
  }

  const api = { validate, timing };
  if (typeof module !== 'undefined') module.exports = api;
  else root.TraceData = api;
})(globalThis);
