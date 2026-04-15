/**
 * DIALOGUE SCENE — Overlay de dialogues TBATE
 *
 * Lancée en overlay par StoryManager via scene.launch('DialogueScene', data).
 * Affiche les lignes une à une avec effet typewriter.
 * Tap/clic/Espace/Entrée → ligne suivante.
 *
 * data attendu :
 *   { conversations: [{name, text, side}], onComplete: fn }
 *
 * NE PAS utiliser export/import — exposé en global via window.
 */
class DialogueScene extends Phaser.Scene {

    constructor() { super({ key: 'DialogueScene' }); }

    init(data) {
        this.dialogueData  = data.conversations ?? [];
        this.currentIndex  = 0;
        this.onComplete    = data.onComplete ?? null;
        this.isTyping      = false;
        this._typeEvent    = null;
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        const BOX_H  = 160;
        const BOX_Y  = H - BOX_H - 16;
        const PAD    = 20;

        // Fond semi-transparent
        this._bg = this.add.rectangle(W / 2, BOX_Y + BOX_H / 2, W - 32, BOX_H, 0x000000, 0.88)
            .setStrokeStyle(2, 0x5533aa);

        // Nom du personnage
        this._nameBox = this.add.rectangle(PAD + 80, BOX_Y - 14, 160, 28, 0x1a0a3a, 0.95)
            .setStrokeStyle(1, 0x5533aa);
        this._txtName = this.add.text(PAD + 80, BOX_Y - 14, '', {
            fontFamily: 'monospace', fontSize: '13px',
            color: '#aa88ff', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5);

        // Texte principal
        this._txtContent = this.add.text(PAD + 8, BOX_Y + 16, '', {
            fontFamily: 'monospace', fontSize: '13px', color: '#ffffff',
            wordWrap: { width: W - 64 }, lineSpacing: 4,
        });

        // Indicateur "continuer"
        this._txtContinue = this.add.text(W - PAD - 8, BOX_Y + BOX_H - 18, '▼', {
            fontFamily: 'monospace', fontSize: '14px', color: '#5533aa',
        }).setOrigin(1, 1).setVisible(false);

        this.tweens.add({
            targets: this._txtContinue, alpha: 0.2,
            duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });

        // Input : tap, clic, espace, entrée
        this.input.on('pointerdown', () => this._advance());
        this.input.keyboard.on('keydown-SPACE', () => this._advance());
        this.input.keyboard.on('keydown-ENTER', () => this._advance());

        this._showLine();
    }

    // ----------------------------------------------------------------

    _showLine() {
        if (this.currentIndex >= this.dialogueData.length) {
            this._finish();
            return;
        }
        const line = this.dialogueData[this.currentIndex];
        this._txtName.setText(line.name ?? '');
        this._txtContent.setText('');
        this._txtContinue.setVisible(false);
        this._typeText(line.text ?? '');
    }

    _typeText(text) {
        if (this._typeEvent) { this._typeEvent.remove(); this._typeEvent = null; }
        this.isTyping = true;
        let i = 0;
        this._typeEvent = this.time.addEvent({
            callback: () => {
                this._txtContent.text += text[i];
                i++;
                if (i >= text.length) {
                    this.isTyping = false;
                    this._txtContinue.setVisible(true);
                }
            },
            repeat: text.length - 1,
            delay: 28,
        });
    }

    _advance() {
        if (this.isTyping) {
            // Affiche tout le texte immédiatement
            if (this._typeEvent) { this._typeEvent.remove(); this._typeEvent = null; }
            this.isTyping = false;
            const line = this.dialogueData[this.currentIndex];
            this._txtContent.setText(line.text ?? '');
            this._txtContinue.setVisible(true);
            return;
        }
        this.currentIndex++;
        this._showLine();
    }

    _finish() {
        this.scene.stop();
        if (this.onComplete) this.onComplete();
    }
}