function trainModel(model, trainingFeatureTensor, trainingLabelTensor) {
  return model.fit(trainingFeatureTensor, trainingLabelTensor, {
    epochs: 250,
    callbacks: {
      onEpochEnd: console.log,
    },
    metrics: ['accuracy']
  });

  return model;
}

export default trainModel;
