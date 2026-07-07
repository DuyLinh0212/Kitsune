export interface RadicalDto {
  id: number;
  radicalCharacter: string;
  radicalName: string;
  englishName: string | null;
  description: string | null;
}

export interface KanjiStructureDto {
  sequence: number;
  parentCharacter: string;
  childCharacter: string;
}

export interface KanjiDto {
  id: number;
  character: string;
  onyomi: string | null;
  kunyomi: string | null;
  amHanViet: string;
  meaning: string;
  strokeCount: number;
  jlptLevel: number | null;
  mnemonic: string | null;
  radical: RadicalDto | null;
  parentStructures: KanjiStructureDto[];
  childStructures: KanjiStructureDto[];
}
