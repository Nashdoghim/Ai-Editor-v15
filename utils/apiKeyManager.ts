import { GoogleGenAI } from '@google/genai';

class ApiKeyManager {
  private apiKeys: string[];
  private currentKeyIndex: number;
  private failedKeys: Set<string>;
  private aiInstances: Map<string, GoogleGenAI>;

  constructor() {
    const keysEnv = import.meta.env.VITE_GEMINI_API_KEYS || '';
    this.apiKeys = keysEnv.split(',').map((key: string) => key.trim()).filter(Boolean);
    this.currentKeyIndex = 0;
    this.failedKeys = new Set();
    this.aiInstances = new Map();

    console.log(`[API Key Manager] Loaded ${this.apiKeys.length} API keys`);
  }

  getCurrentKey(): string | null {
    if (this.apiKeys.length === 0) return null;

    const availableKeys = this.apiKeys.filter(key => !this.failedKeys.has(key));

    if (availableKeys.length === 0) {
      console.warn('[API Key Manager] All keys have failed. Resetting failed keys.');
      this.failedKeys.clear();
      return this.apiKeys[0];
    }

    this.currentKeyIndex = this.currentKeyIndex % availableKeys.length;
    return availableKeys[this.currentKeyIndex];
  }

  getAIInstance(): GoogleGenAI | null {
    const currentKey = this.getCurrentKey();
    if (!currentKey) return null;

    if (!this.aiInstances.has(currentKey)) {
      console.log(`[API Key Manager] Creating new AI instance for key: ${currentKey.slice(0, 10)}...`);
      this.aiInstances.set(currentKey, new GoogleGenAI({ apiKey: currentKey }));
    }

    return this.aiInstances.get(currentKey)!;
  }

  markCurrentKeyAsFailed(): void {
    const currentKey = this.getCurrentKey();
    if (!currentKey) return;

    console.warn(`[API Key Manager] Marking key as failed: ${currentKey.slice(0, 10)}...`);
    this.failedKeys.add(currentKey);

    this.currentKeyIndex++;

    const availableKeys = this.apiKeys.filter(key => !this.failedKeys.has(key));
    console.log(`[API Key Manager] Remaining available keys: ${availableKeys.length}/${this.apiKeys.length}`);

    if (availableKeys.length > 0) {
      const nextKey = this.getCurrentKey();
      console.log(`[API Key Manager] Rotating to next key: ${nextKey?.slice(0, 10)}...`);
    }
  }

  async testCurrentKey(): Promise<boolean> {
    const ai = this.getAIInstance();
    if (!ai) return false;

    try {
      await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
        config: {}
      });
      return true;
    } catch (error) {
      console.error('[API Key Manager] Key test failed:', error);
      return false;
    }
  }

  getStats() {
    return {
      total: this.apiKeys.length,
      failed: this.failedKeys.size,
      available: this.apiKeys.length - this.failedKeys.size,
      currentIndex: this.currentKeyIndex
    };
  }
}

export const apiKeyManager = new ApiKeyManager();
