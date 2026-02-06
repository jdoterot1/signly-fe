import { Injectable } from '@angular/core';

export type GuideStepKey = 'template' | 'document';
export type GuideStepStatus = 'done' | 'active' | 'pending';

export interface GuideStep {
  title: string;
  description: string;
  status: GuideStepStatus;
}

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

  getSteps(activeKey?: GuideStepKey): GuideStep[] {
    const resolvedIndex = activeKey
      ? this.steps.findIndex(step => step.key === activeKey)
      : 0;
    const activeIndex = resolvedIndex >= 0 ? resolvedIndex : 0;

    return this.steps.map((step, index) => {
      const status: GuideStepStatus = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending';
      return {
        title: step.title,
        description: step.description,
        status
      };
    });
  }
}
