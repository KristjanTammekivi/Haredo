import { ExchangeChainState, QueueChainState } from '../types';

export const mergeState = <T extends ExchangeChainState | QueueChainState<unknown>>(base: T, top: Partial<T>): T => {
    const arrayProperties = Object.entries(top).filter(([, value]) => Array.isArray(value));
    return {
        ...base,
        ...top,
        ...Object.fromEntries(
            arrayProperties.map(([key, value]) => {
                const baseValue = (base as any)[key] || [];
                const updatedValue = [...baseValue, ...value];
                return [key, updatedValue];
            })
        )
    };
};
