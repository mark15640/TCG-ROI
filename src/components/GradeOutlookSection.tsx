import { CONDITION_BY_ID, GRADE_DISTRIBUTION_PRESETS, GRADES } from '../lib/data';
import type { Inputs } from '../lib/types';
import { NumberInput } from './fields';
import type { Update } from '../App';

export function GradeOutlookSection({ inputs, update, total }: { inputs: Inputs; update: Update; total: number }) {
  const off = Math.abs(total - 100) > 0.01;

  return (
    <div className="panel">
      <div className="panel-intro">
        <p className="muted">
          Your odds of landing each grade, pre-filled for a {CONDITION_BY_ID[inputs.condition].label} card. Adjust for
          centering, corners, edges and surface.
        </p>
        {!inputs.distributionIsPreset && (
          <button
            type="button"
            className="link"
            onClick={() =>
              update((d) => {
                d.gradeDistribution = { ...GRADE_DISTRIBUTION_PRESETS[d.condition] };
                d.distributionIsPreset = true;
              })
            }
          >
            Reset to {inputs.condition} preset
          </button>
        )}
      </div>
      <div className="dist">
        {GRADES.map((g) => (
          <div className="dist-row" key={g}>
            <span className="dist-grade">{g}</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={inputs.gradeDistribution[g]}
              aria-label={`Chance of grade ${g}`}
              onChange={(e) =>
                update((d) => {
                  d.gradeDistribution[g] = Number(e.target.value);
                  d.distributionIsPreset = false;
                })
              }
            />
            <NumberInput
              className="narrow"
              step={1}
              suffix="%"
              value={inputs.gradeDistribution[g]}
              ariaLabel={`Chance of grade ${g} (percent)`}
              onChange={(v) =>
                update((d) => {
                  d.gradeDistribution[g] = v ?? 0;
                  d.distributionIsPreset = false;
                })
              }
            />
          </div>
        ))}
      </div>
      <p className={off ? 'warn' : 'muted'}>
        Total: {total}%{off && ' — odds are scaled to 100% when calculating.'}
      </p>
    </div>
  );
}
