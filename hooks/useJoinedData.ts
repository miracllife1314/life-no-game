import { useMemo } from 'react';
import { computeJoinedData, JoinInputs } from '@/services/joinData';

export function useJoinedData(inputs: JoinInputs) {
  return useMemo(() => {
    return computeJoinedData(inputs);
  }, [
    inputs.profArr,
    inputs.finalMissions,
    inputs.batchesList,
    inputs.templatesList,
    inputs.subsList,
    inputs.attendanceList,
    inputs.coursesList,
    inputs.userAchsList,
    inputs.achsList,
    inputs.notesList,
    inputs.rulesList,
    inputs.deckCardsList,
    inputs.cardsList,
    inputs.userDecksList,
    inputs.decksList,
    inputs.userPetsList,
    inputs.petStagesList,
    inputs.candidatesList,
  ]);
}
