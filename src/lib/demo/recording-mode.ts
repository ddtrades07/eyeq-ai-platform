import { cookies } from 'next/headers';

export const RECORDING_COOKIE = 'eyeq_recording_mode';

/** True when ?recording=true was captured into a cookie for polished walkthroughs. */
export async function isRecordingMode(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(RECORDING_COOKIE)?.value === '1';
}
