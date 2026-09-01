interface BuiltInAiCreateMonitor extends EventTarget {}

interface BuiltInAiTranslatorCreateOptions {
  sourceLanguage: string;
  targetLanguage: string;
  signal?: AbortSignal;
  monitor?: (monitor: BuiltInAiCreateMonitor) => void;
}

interface BuiltInAiTranslator {
  translate(
    text: string,
    options?: { signal?: AbortSignal },
  ): Promise<string>;
  destroy?(): void;
}

interface BuiltInAiTranslatorConstructor {
  availability(options: {
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<string>;
  create(
    options: BuiltInAiTranslatorCreateOptions,
  ): Promise<BuiltInAiTranslator>;
}

interface BuiltInAiGlobal {
  Translator?: BuiltInAiTranslatorConstructor;
}
