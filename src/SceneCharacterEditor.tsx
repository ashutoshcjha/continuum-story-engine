import { useMemo, useState } from 'react';
import type { StoryEntity, StoryScene } from './model';

interface SceneCharacterEditorProps {
  scene: StoryScene;
  characters: StoryEntity[];
  onUpdateScene: (changes: Partial<StoryScene['scene']>) => void;
  onCreateCharacter: (sceneId: string, name: string) => void;
}

export function SceneCharacterEditor({
  scene,
  characters,
  onUpdateScene,
  onCreateCharacter,
}: SceneCharacterEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState('');
  const [newCharacterName, setNewCharacterName] = useState('');

  const participantIds = scene.scene.participantIds ?? [];
  const participants = useMemo(
    () => participantIds
      .map((id) => characters.find((character) => character.id === id))
      .filter((character): character is StoryEntity => Boolean(character)),
    [characters, participantIds],
  );
  const availableCharacters = characters.filter((character) => !participantIds.includes(character.id));

  const addExisting = () => {
    if (!selectedCharacterId) return;
    onUpdateScene({ participantIds: [...participantIds, selectedCharacterId] });
    setSelectedCharacterId('');
  };

  const removeCharacter = (characterId: string) => {
    onUpdateScene({
      participantIds: participantIds.filter((id) => id !== characterId),
      povCharacterId: scene.scene.povCharacterId === characterId ? undefined : scene.scene.povCharacterId,
    });
  };

  const createCharacter = () => {
    const name = newCharacterName.trim();
    if (!name) return;
    onCreateCharacter(scene.id, name);
    setNewCharacterName('');
    setIsOpen(false);
  };

  return (
    <div
      className="scene-cast-editor"
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <div className="scene-cast-chips">
        {participants.map((character) => (
          <span key={character.id}>
            {character.name}
            <button
              type="button"
              aria-label={`Remove ${character.name} from scene`}
              onClick={() => removeCharacter(character.id)}
            >
              ×
            </button>
          </span>
        ))}
        {!participants.length && <em>No characters assigned</em>}
        <button
          type="button"
          className="scene-cast-add"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
        >
          + Character
        </button>
      </div>

      {isOpen && (
        <div className="scene-cast-popover">
          <label>
            <span>Add an existing character</span>
            <div>
              <select value={selectedCharacterId} onChange={(event) => setSelectedCharacterId(event.target.value)}>
                <option value="">Choose character</option>
                {availableCharacters.map((character) => (
                  <option key={character.id} value={character.id}>{character.name}</option>
                ))}
              </select>
              <button type="button" disabled={!selectedCharacterId} onClick={addExisting}>Add</button>
            </div>
          </label>

          <label>
            <span>Create a new character</span>
            <div>
              <input
                value={newCharacterName}
                placeholder="Character name"
                onChange={(event) => setNewCharacterName(event.target.value)}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    createCharacter();
                  }
                  if (event.key === 'Escape') setIsOpen(false);
                }}
              />
              <button type="button" disabled={!newCharacterName.trim()} onClick={createCharacter}>Create</button>
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
