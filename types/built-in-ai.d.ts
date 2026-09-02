type BuiltInAiCreateMonitor = EventTarget;

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

interface BuiltInAiLanguageDetectorResult {
  detectedLanguage: string;
  confidence: number;
}

interface BuiltInAiLanguageDetector {
  detect(
    text: string,
    options?: { signal?: AbortSignal },
  ): Promise<BuiltInAiLanguageDetectorResult[]>;
  destroy?(): void;
}

interface BuiltInAiLanguageDetectorCreateOptions {
  expectedInputLanguages?: string[];
  signal?: AbortSignal;
  monitor?: (monitor: BuiltInAiCreateMonitor) => void;
}

interface BuiltInAiLanguageDetectorConstructor {
  create(
    options?: BuiltInAiLanguageDetectorCreateOptions,
  ): Promise<BuiltInAiLanguageDetector>;
}

interface BuiltInAiGlobal {
  Translator?: BuiltInAiTranslatorConstructor;
  LanguageDetector?: BuiltInAiLanguageDetectorConstructor;
}
