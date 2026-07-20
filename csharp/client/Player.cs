using System;
using System.Collections.Generic;

namespace StarGreetings.Client
{
    [Serializable]
    public class Player
    {
        public int id { get; set; }
        public string name { get; set; }
        public List<CardInstance> stack { get; set; }
        public float radiusOffset { get; set; }
        public float angleOffset { get; set; }
        public int coins { get; set; }
        public int freeStackBuys { get; set; }
        public bool isBot { get; set; }

        public int stackCount => stack != null ? stack.Count : 0;

        public Player()
        {
            stack = new List<CardInstance>();
        }

        public Player(string name, int id)
        {
            this.id = id;
            this.name = name;
            this.stack = new List<CardInstance>();
            this.radiusOffset = 0f;
            this.angleOffset = 0f;
            this.coins = 300;
            this.freeStackBuys = 10;
            this.isBot = false;
        }
    }
}
