using System;

namespace StarGreetings.Client
{
    [Serializable]
    public class CardInstance
    {
        public string id { get; set; }
        public string name { get; set; }
        public string industry { get; set; }
        public string imagePath { get; set; }
        public string movie { get; set; }
        public string instanceId { get; set; }
        public int? playedBy { get; set; } // Nullable int to match JS null

        public CardInstance() { }

        public CardInstance(StarData starData, string instanceId)
        {
            this.id = starData.id;
            this.name = starData.name;
            this.industry = starData.industry;
            this.imagePath = starData.imagePath;
            this.movie = starData.movie ?? "";
            this.instanceId = instanceId;
            this.playedBy = null;
        }
    }

    [Serializable]
    public class StarData
    {
        public string id { get; set; }
        public string name { get; set; }
        public string industry { get; set; }
        public string imagePath { get; set; }
        public string movie { get; set; }
    }
}
