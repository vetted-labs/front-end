"use client";

import { useEffect, useRef, useState } from "react";

interface UseSubstepIndexArgs {
  topStepIndex: number;
}

export function useSubstepIndex({ topStepIndex }: UseSubstepIndexArgs) {
  const [substepIndex, setSubstepIndex] = useState(0);
  const pendingRef = useRef<number | null>(null);

  // eslint-disable-next-line no-restricted-syntax -- this hook IS the abstraction over top-step transitions; resetting the substep index when the parent step changes is its core responsibility.
  useEffect(() => {
    if (pendingRef.current !== null) {
      setSubstepIndex(pendingRef.current);
      pendingRef.current = null;
    } else {
      setSubstepIndex(0);
    }
  }, [topStepIndex]);

  const queuePendingSubstep = (index: number) => {
    pendingRef.current = index;
  };

  return { substepIndex, setSubstepIndex, queuePendingSubstep };
}
