import * as tf from "@tensorflow/tfjs";

const model = tf.sequential();

model.add(
  tf.layers.dense({
    activation: "linear",
    inputShape: [33],
    units: 4,
  }),
);

model.add(
  tf.layers.dense({
    activation: "linear",
    inputShape: [4],
    units: 1,
  }),
);

const optimizer = tf.train.sgd(0.1);

model.compile({
  optimizer,
  loss: "meanSquaredError",
});

export default model;
