export type FoodCaloEstimateObject = {
    id: string;
    predictName: string;
    calo: number;
    confidencePercentage: number;
    publicUrl: {
        originImage: string;
    };
};