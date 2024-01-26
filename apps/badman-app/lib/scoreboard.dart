import 'package:flutter/material.dart';

class Scoreboard extends StatefulWidget {
  const Scoreboard({super.key});

  @override
  ScoreboardState createState() => ScoreboardState();
}

class ScoreboardState extends State<Scoreboard> {
  int score1 = 0;
  int score2 = 0;

  void _incrementScore(int player) {
    setState(() {
      if (player == 1) {
        score1++;
      } else if (player == 2) {
        score2++;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        GestureDetector(
          onTap: () => _incrementScore(1),
          child: Container(
            padding: const EdgeInsets.all(20),
            color: Colors.blue,
            child: Text(
              'Player 1: $score1',
              style: const TextStyle(fontSize: 20, color: Colors.white),
            ),
          ),
        ),
        GestureDetector(
          onTap: () => _incrementScore(2),
          child: Container(
            padding: const EdgeInsets.all(20),
            color: Colors.green,
            child: Text(
              'Player 2: $score2',
              style: const TextStyle(fontSize: 20, color: Colors.white),
            ),
          ),
        ),
      ],
    );
  }
}
