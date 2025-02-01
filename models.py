from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Question(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(500), nullable=False)
    prep_time = db.Column(db.Integer, default=30)  # Default prep time in seconds
    answer_time = db.Column(db.Integer, default=120)  # Default answer time in seconds

    def to_dict(self):
        return {
            "id": self.id,
            "text": self.text,
            "prepTime": self.prep_time,
            "answerTime": self.answer_time
        }
