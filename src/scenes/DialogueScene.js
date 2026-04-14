export class DialogueScene extends Phaser.Scene {
    constructor() {
        super({ key: 'DialogueScene' });
    }

    init(data) {
        this.dialogueData = data.conversations; // Le tableau d'objets du JSON
        this.currentIndex = 0;
        this.onComplete = data.onComplete;
    }

    create() {
        const { width, height } = this.scale;
        
        // 1. Fond de la boîte de dialogue (Semi-transparent)
        const boxHeight = 150;
        this.bg = this.add.rectangle(width/2, height - boxHeight/2 - 20, width - 40, boxHeight, 0x000000, 0.8)
            .setStrokeStyle(2, 0x3498db);

        // 2. Zone de texte
        this.nameText = this.add.text(40, height - boxHeight - 10, '', { font: 'bold 20px Arial', fill: '#3498db' });
        this.contentText = this.add.text(50, height - boxHeight + 20, '', { font: '18px Arial', fill: '#ffffff', wordWrap: { width: width - 100 } });

        // 3. Portraits (Espaces réservés)
        this.leftPortrait = this.add.image(100, height - boxHeight - 80, 'portraits').setVisible(false);
        this.rightPortrait = this.add.image(width - 100, height - boxHeight - 80, 'portraits').setVisible(false);

        // Interaction pour passer au texte suivant
        this.input.on('pointerdown', () => this.nextLine());
        
        this.displayLine();
    }

    displayLine() {
        const line = this.dialogueData[this.currentIndex];
        this.nameText.setText(line.name);
        
        // Gestion des portraits
        this.leftPortrait.setVisible(line.side === 'left');
        this.rightPortrait.setVisible(line.side === 'right');
        // this.leftPortrait.setFrame(line.portrait); // Si tu as un Atlas

        // Effet Typewriter
        this.typewriteText(line.text);
    }

    typewriteText(text) {
        let i = 0;
        this.contentText.setText('');
        this.isTyping = true;
        
        this.time.addEvent({
            callback: () => {
                this.contentText.text += text[i];
                i++;
                if (i === text.length) this.isTyping = false;
            },
            repeat: text.length - 1,
            delay: 30
        });
    }

    nextLine() {
        if (this.isTyping) return; // Empêche de skip trop vite

        this.currentIndex++;
        if (this.currentIndex < this.dialogueData.length) {
            this.displayLine();
        } else {
            this.scene.stop();
            if (this.onComplete) this.onComplete();
        }
    }
}
