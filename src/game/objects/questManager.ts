export enum QuestStatus {
    IDLE = 'IDLE',
    INTRO_DIALOGUE = 'INTRO_DIALOGUE',
    COLLECTING = 'COLLECTING',
    READY_FOR_QUIZ = 'READY_FOR_QUIZ',
    QUIZ_ACTIVE = 'QUIZ_ACTIVE',
    COMPLETED = 'COMPLETED'
}

export interface QuestData {
    requiredInfos: string[];
    collectedInfos: Set<string>;
    status: QuestStatus;
}

export class QuestManager {
    private questData: QuestData;

    constructor(requiredInfos: string[]) {
        this.questData = {
            requiredInfos,
            collectedInfos: new Set<string>(),
            status: QuestStatus.IDLE
        };
    }

    getStatus(): QuestStatus {
        return this.questData.status;
    }

    setStatus(status: QuestStatus) {
        this.questData.status = status;
    }

    collectInfo(infoKey: string): boolean {
        if (this.questData.status !== QuestStatus.COLLECTING) return false;

        const before = this.questData.collectedInfos.size;
        this.questData.collectedInfos.add(infoKey);
        const changed = this.questData.collectedInfos.size !== before;

        if (changed && this.hasCollectedAll()) {
            this.setStatus(QuestStatus.READY_FOR_QUIZ);
        }

        return changed;
    }

    getRequiredInfos(): string[] {
        return [...this.questData.requiredInfos];
    }

    getCollectedInfos(): string[] {
        return Array.from(this.questData.collectedInfos);
    }

    hasInfo(infoKey: string): boolean {
        return this.questData.collectedInfos.has(infoKey);
    }

    getRequiredCount(): number {
        return this.questData.requiredInfos.length;
    }

    getCollectedCount(): number {
        return this.questData.collectedInfos.size;
    }

    hasCollectedAll(): boolean {
        return this.questData.requiredInfos.every(info => this.questData.collectedInfos.has(info));
    }

    reset() {
        this.questData.collectedInfos.clear();
        this.questData.status = QuestStatus.IDLE;
    }
}
