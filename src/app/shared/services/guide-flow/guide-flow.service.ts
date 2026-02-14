import { Injectable } from '@angular/core';

export type GuideStepKey = 'template' | 'document';
export type GuideStepStatus = 'done' | 'active' | 'pending';

export interface GuideStep {
  title: string;
  description: string;
  status: GuideStepStatus;
}

type GuideCompletionState = Partial<Record<GuideStepKey, boolean>>;

interface GuideStepDefinition {
  key: GuideStepKey;
  title: string;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class GuideFlowService {
  private readonly steps: GuideStepDefinition[] = [
    {
      key: 'template',
      title: 'Crea tu primera plantilla',
      description: 'Define los datos base y sube el archivo que vas a mapear.'
    },
    {
      key: 'document',
      title: 'Crea tu primer documento',
      description: 'Carga el archivo final y deja listo el envio a firma.'
    }
  ];

  getSteps(activeKey?: GuideStepKey, completed: GuideCompletionState = {}): GuideStep[] {
    const firstPending = this.steps.findIndex(step => !completed[step.key]);
    const fallbackActiveIndex = firstPending >= 0 ? firstPending : this.steps.length - 1;

    const resolvedIndex = activeKey ? this.steps.findIndex(step => step.key === activeKey) : fallbackActiveIndex;
    const activeIndex = resolvedIndex >= 0 ? resolvedIndex : fallbackActiveIndex;

    return this.steps.map((step, index) => {
      const isCompleted = !!completed[step.key];
      const status: GuideStepStatus = isCompleted ? 'done' : index === activeIndex ? 'active' : 'pending';
      return {
        title: step.title,
        description: step.description,
        status
      };
    });
  }
}
