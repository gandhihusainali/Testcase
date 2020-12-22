/// <reference path="http://code.createjs.com/createjs-2013.12.12.min.js" />
/// <reference path="../../../Content/GamesDownloadTemplate/lib/ScormHelper.js" />
var stage;
var Game = Game || (function (createjs, $) {

    function Game(canvasId, gameData) {

        var assetsPath = gameData.assetsPath || "";

        var assets = [
            { id: "instructions_background", src: assetsPath + "instructions_background.png" },
            { id: "instructions_question", src: assetsPath + "instructions_question.png" },
            { id: "start_button", src: assetsPath + "start_button.png" },
            { id: "title_background", src: assetsPath + "title_background.jpg" },
            { id: "plain_background", src: assetsPath + "plain_background.jpg" },
            { id: "musicOn", src: assetsPath + "musicOn.png" },
            { id: "musicOff", src: assetsPath + "musicOff.png" },
            { id: "winner_screen_image", src: assetsPath + "byk_game_image.png" },
            { id: "instructions", src: assetsPath + "buildYourKnowledgeInstructions.png" }
        ];

        createjs.Sound.registerSound({ src: assetsPath + "ButtonClickDry.mp3", id: "clickSoundDry" });
        createjs.Sound.registerSound({ src: assetsPath + "tone.mp3", id: "tone" });
        createjs.Sound.registerSound({ src: assetsPath + "buzz.mp3", id: "buzz" });
        createjs.Sound.registerSound({ src: assetsPath + "audienceApplause.mp3", id: "audienceApplause" });
        createjs.Sound.registerSound({ src: assetsPath + "audienceAww.mp3", id: "audienceAww" });
        createjs.Sound.registerSound({ src: assetsPath + "gameFinished.mp3", id: "gameFinished" });
        createjs.Sound.registerSound({ src: assetsPath + "openingMelody.mp3", id: "openingMelody" });
        createjs.Sound.registerSound({ src: assetsPath + "activateHelp.mp3", id: "activateHelp" });

        var clickSound = createjs.Sound.createInstance("clickSoundDry");
        clickSound.volume = clickSound.volume * 0.5;

        // Randomize Questions/Answers
        if (gameData.RandomizeQuestions || gameData.RandomizeQuestions === undefined) {
            gameData.Questions = shuffle(gameData.Questions);
        }


        for (var i = 0; i < gameData.Questions.length; i++) {
            if (gameData.RandomizeAnswers || gameData.RandomizeAnswers === undefined) {
                gameData.Questions[i].Answers = shuffle(gameData.Questions[i].Answers);
            }
        }

        function shuffle(array) {
            var currentIndex = array.length, temporaryValue, randomIndex;

            while (0 !== currentIndex) {
                randomIndex = Math.floor(Math.random() * currentIndex);
                currentIndex -= 1;
                temporaryValue = array[currentIndex];
                array[currentIndex] = array[randomIndex];
                array[randomIndex] = temporaryValue;
            }
            return array;
        }


        var queue = new createjs.LoadQueue(false);

        queue.addEventListener("complete", function (event) {
            initializeGame();
        });
        queue.loadManifest(assets);

        var isLmsConnected = false;

        if (typeof ScormHelper !== 'undefined') {
            isLmsConnected = ScormHelper.initialize();
        }


        gameData = gameData || {};
        var originalGameData = $.extend(true, {}, gameData);
        var self = this;
        var gameState = {
            correctAnswer: "",
            feedback: null
        }
        var musicOn = true;

        gameData.Awards = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000];

        //original questions / answers
        // var originalArray = gameData.Questions[questionIndex].Answers;
        gameData.Questions = gameData.Questions.slice(0,15);
        function initializeGame() {
            var cellOrigin = [30, 30];
            var cellMargin = [5, 5];
            var cellSize = [150, 150];

            self.gameData = gameData;

            var stage = new createjs.Stage(canvasId);
            stage.enableMouseOver(10);

            createjs.Touch.enable(stage, false, true);

            stage.addChild(new createjs.Bitmap(queue.getResult("plain_background")))

            function handleInstructionsMouseOver(event) {
                if (event.type == "mouseover") {
                    createjs.Tween.get(questionMark, { loop: false }).to({ scaleX: 1.0625, scaleY: 1.0625 }, 50);
                }
                else {
                    createjs.Tween.get(questionMark, { loop: false }).to({ scaleX: 1.0, scaleY: 1.0 }, 50);
                }
            }

            createjs.Touch.enable(stage);

            var originalWidth = stage.canvas.width;
            var originalHeight = stage.canvas.height;

            var totalQuestions, AwardIndex, isFiftyPercentUsed, isSeventyFivePercentUsed, isAskAudienceUsed, isAskAudienceWindowOpen, isFirstQuestion;


            function createTitleView() {

                totalQuestions = 15;
                questionIndex = 0;
                AwardIndex = 0;
                isFiftyPercentUsed = false;
                isSeventyFivePercentUsed = false;
                isAskAudienceUsed = false;
                isAskAudienceWindowOpen = false;
                isFirstQuestion = true;


                var view = new createjs.Container();

                var titleText = new createjs.Text(gameData.Title, "36px Arial Black", "#7649AE");
                titleText.shadow = new createjs.Shadow("gray", 1, 1, 3);
                titleText.lineWidth = 780;
                titleText.x = 10;
                titleText.y = 10;

                var descriptionText = new createjs.Text(gameData.Description, "20px Bold Arial", "dark gray");
                descriptionText.lineWidth = 780;
                descriptionText.x = 10;
                descriptionText.y = 100;

                var startButton = new createjs.Bitmap(queue.getResult("start_button"));
                //startButton.shadow = new createjs.Shadow("gray", 3, 3, 3);
                startButton.hitArea = new createjs.Shape(new createjs.Graphics().beginFill("#f00").drawCircle(50, 50, 50));
                startButton.cursor = 'pointer';
                startButton.regX = 50;
                startButton.regY = 50;
                startButton.x = 725;
                startButton.y = 525;

                view.addChild(new createjs.Bitmap(queue.getResult("title_background")))
                view.addChild(startButton);
                view.addChild(descriptionText);
                view.addChild(titleText);

                startButton.addEventListener("click", function (event) {
                    clickSound.play();
                    createjs.Sound.play("openingMelody", { volume: 0.75 });
                    showView(createMainGameView());
                });

                return view;
            }

            function createAwardBoard() {

                var awardsContainer = new createjs.Container();
                var awardsContainerBackground = new createjs.Shape();

                awardsContainerBackground.graphics.beginFill("black").beginStroke("#000").setStrokeStyle(1).drawRect(0, 0, 150, 370, 5).endFill().endStroke();
                //awardsContainerBackground.shadow = new createjs.Shadow("#7449AE", 3, 3, 10);
                awardsContainer.addChild(awardsContainerBackground);
                if (gameData.Awards != null) {
                    for (var i = 0; i < gameData.Awards.length; ++i) {

                        var awardContainer = new createjs.Container();

                        var awardBackground = new createjs.Shape();




                        var award = gameData.Awards[i];
                        var box = new createjs.Shape();

                        var y = (i * 25);

                        var awardText = new createjs.Text(award, "18px bold", "white");

                        awardText.y = (i * 25);
                        awardText.x = 20;
                        if (i == AwardIndex) {
                            //change background color
                            awardBackground.graphics.setStrokeStyle(1).beginFill("#7449AE").drawRect(0, y, 150, 25);
                        } else if (i < AwardIndex) {
                            awardBackground.graphics.setStrokeStyle(1).beginFill("#D8BFD8").drawRect(0, y, 150, 25);

                        } else {
                            awardBackground.isVisible(false);
                        }
                        awardContainer.addChild(awardBackground);
                        awardContainer.addChild(awardText);
                        awardsContainer.addChild(awardContainer);

                    }

                    awardsContainer.x = 720;
                }
                return awardsContainer;
            }
            function createMainGameView() {
                var mainView = new createjs.Container();

                showNextQuestion();

                var currentArea = getDisplayQuestionArea();

                function handleAnswerClick(event) {
                    if (isClickEnabled) {
                        if (currentLmsInteraction != null) {
                            var answer = event.currentTarget.answer;

                            currentLmsInteraction.stop();
                            currentLmsInteraction.result = answer.IsCorrect ? ScormHelper.results.correct : ScormHelper.results.incorrect;
                            currentLmsInteraction.learnerResponse = answer.Text;
                            currentLmsInteraction.save();
                            currentLmsInteraction = null;
                        }

                        // Needs updating with audience noises
                        if (event.currentTarget.isCorrect) {
                            createjs.Sound.play("audienceApplause", { volume: 0.75 });
                            currentArea = getCorrectAnswerArea();
                            ++AwardIndex;
                        }
                        else {
                            createjs.Sound.play("audienceAww", { volume: 0.75 });
                            currentArea = getIncorrectAnswerArea();
                        }

                        mainView.addChild(currentArea);

                        stage.update();
                    }
                }

                function getDisplayQuestionArea() {
                    var container = new createjs.Container();
                    container.x = 30;

                    var questionContainer = new createjs.Container();
                    var questionBox = new createjs.Shape();
                    questionBox.graphics.beginFill("#000").beginStroke("#000").setStrokeStyle(1).drawRoundRect(0, 0, 550, 370, 5).endFill().endStroke();
                    //questionBox.shadow = new createjs.Shadow("#7449AE", 3, 3, 10);

                    if (isLmsConnected) {
                        var question = gameData.Questions[questionIndex];

                        currentLmsInteraction = ScormHelper.cmi.interactions().new();
                        currentLmsInteraction.type = ScormHelper.interactions.choice;
                        currentLmsInteraction.id = question.Id;
                        currentLmsInteraction.description = question.Text;
                    }

                    var questionText = new createjs.Text(gameData.Questions[questionIndex].Text, "20px Arial Black", "#fff");
                    questionText.y = 20;
                    questionText.x = 50;
                    questionText.lineWidth = 440;
                    questionContainer.addChild(questionBox, questionText);

                    container.addChild(questionContainer);

                    awardsBoard = createAwardBoard();
                    awardsBoard.x = 600;
                    container.addChild(awardsBoard);

                    var abc = ['A', 'B', 'C', 'D'];
                    for (var i = 0; i < gameData.Questions[questionIndex].Answers.length; ++i) {
                        var answerContainer = new createjs.Container();
                        var answer = gameData.Questions[questionIndex].Answers[i];
                        var box = new createjs.Shape();

                        var x = 0;
                        var y = 0;

                        if (i == 0) {
                            x = 0;
                            y = 410;
                        } else if (i == 1) {
                            x = 300;
                            y = 410;
                        } else if (i == 2) {
                            x = 0;
                            y = 480;
                        } else if (i == 3) {
                            x = 300;
                            y = 480;
                        }
                        var answerContainerLetter = new createjs.Text(abc[i], "bold 16px Arial", "#000");
                        var answerText = new createjs.Text(answer.Text, "bold 16px Arial", "#fff");
                        answerText.lineWidth = 240;

                        var textWidth = answerText.getMeasuredWidth();
                        if (textWidth > 240) {
                            box.graphics.beginFill("black").beginStroke("#000").setStrokeStyle(1).drawRoundRect(x, y, 250, 60, 5).endFill().endStroke();
                        } else {
                            box.graphics.beginFill("black").beginStroke("#000").setStrokeStyle(1).drawRoundRect(x, y, 250, 30, 5).endFill().endStroke();
                        }
                        //box.shadow = new createjs.Shadow("7449AE", 3, 3, 10);
                        answerContainerLetter.x = (x - 25);
                        answerContainerLetter.y = (y + 8);
                        answerText.y = (y + 7);
                        answerText.x = (x + 5);
                        answerContainer.isCorrect = answer.IsCorrect;
                        if (answer.IsCorrect) {
                            gameState.correctAnswer = answer.Text;
                        }
                        answerContainer.addChild(box);
                        answerContainer.addChild(answerText);
                        answerContainer.addChild(answerContainerLetter);
                        //////answer container
                        answerContainer.addEventListener("click", handleAnswerClick, clickSound.play());
                        answerContainer.answer = answer;

                        container.addChild(answerContainer, answerText);
                    }

                    return container;
                }

                var currentLmsInteraction = null;

                function showNextQuestion() {
                    gameState.submitedScore = false;
                    currentArea = getDisplayQuestionArea();
                    if (create5050 && create5050.visible == false) {
                        create5050.visible = true;
                    }
                    if (isAskAudienceUsed == true && isAskAudienceWindowOpen == true) {
                        mainView.removeAllChildren();
                        createHelpline();

                    }
                    mainView.removeChild(currentArea);

                    currentArea = null;

                    if (isFirstQuestion) {
                        isFirstQuestion = false;
                    } else {                       
                        ++questionIndex;
                    }
                   
                    if (questionIndex < gameData.Questions.length) {
                        currentArea = getDisplayQuestionArea();
                    }
                    else {
                        currentArea = createWinnerView();
                    }


                    mainView.addChild(currentArea);
                    isClickEnabled = true;
                    stage.update();
                }

                function getIncorrectAnswerArea() {
                    gameState.feedback = gameData.Questions[questionIndex].Feedback ? gameData.Questions[questionIndex].Feedback : ""
                    isClickEnabled = false;

                    var container = new createjs.Container();
                    container.x = 150;
                    container.y = 100;
                    var containerBG = new createjs.Shape();
                    containerBG.graphics.beginFill("#FFFFFF").beginStroke("#000000").setStrokeStyle(1).drawRoundRect(0, 0, 300, 200, 5).endFill().endStroke();

                    var titleContainer = new createjs.Container();
                    titleContainer.x = 0;
                    titleContainer.y = 0;
                    var titleText = new createjs.Text("INCORRECT", "bold 36px Arial", "#000");
                    titleText.x = 150;
                    titleText.y = 5;
                    titleText.textAlign = "center";
                    var titleBackground = new createjs.Shape();
                    titleBackground.graphics.beginFill("#CC0000").beginStroke("#CC0000").setStrokeStyle(1).drawRoundRect(0, 0, 300, 50, 5).endFill().endStroke();
                    titleContainer.addChild(titleBackground, titleText);

                    var nextContainer = new createjs.Container();
                    nextContainer.x = 90;
                    nextContainer.y = 60;
                    var nextText = new createjs.Text("NEXT", "bold 20px Arial", "#7449AE");
                    nextText.x = 60;
                    nextText.y = 5;
                    nextText.textAlign = "center";
                    var nextBackground = new createjs.Shape();
                    nextBackground.graphics.beginFill("black").beginStroke("#000").setStrokeStyle(1).drawRoundRect(0, 0, 120, 30, 5).endFill().endStroke();
                    nextContainer.addChild(nextBackground, nextText);

                    var CorrectAnswerLabel = new createjs.Text("The correct answer is:", "bold 16px Arial", "#000");
                    CorrectAnswerLabel.lineWidth = 200;
                    CorrectAnswerLabel.x = (300 - CorrectAnswerLabel.getBounds().width) / 2;
                    CorrectAnswerLabel.y = nextContainer.y + 40;
                    CorrectAnswerText = new createjs.Text(gameState.correctAnswer, "14px Arial", "#000");
                    CorrectAnswerText.lineWidth = 200;
                    CorrectAnswerText.x = (300 - CorrectAnswerText.getBounds().width) / 2;
                    CorrectAnswerText.y = nextContainer.y + 60;

                    var feedback = new createjs.Container();
                    feedback.x = 0;
                    feedback.y = 150;
                    var feedbackBG = new createjs.Shape();
                    feedbackBG.graphics.beginFill("#CCCCCC").setStrokeStyle(1).drawRoundRect(0, 0, 300, 50, 5).endFill();
                    feedback.addChild(feedbackBG);

                    if (gameState.feedback) {
                        var feedbackText = new createjs.Text(gameState.feedback, "14px Arial italic", "#000");
                        feedbackText.lineWidth = 200;
                        feedbackText.x = 150;
                        feedbackText.y = 10;
                        feedbackText.textAlign = "center";
                        feedback.addChild(feedbackText);
                    }

                    nextContainer.addEventListener("click", function () {
                        mainView.removeAllChildren();    
                        createHelpline();
                        showNextQuestion()
                    });

                    container.addChild(containerBG, feedback, titleContainer, nextContainer, CorrectAnswerText, CorrectAnswerLabel);
                    return container;
                }

                function getCorrectAnswerArea() {
                    gameState.feedback = gameData.Questions[questionIndex].Feedback ? gameData.Questions[questionIndex].Feedback : ""
                    isClickEnabled = false;

                    var container = new createjs.Container();
                    container.x = 150;
                    container.y = 100;
                    var containerBG = new createjs.Shape();
                    containerBG.graphics.beginFill("#FFFFFF").beginStroke("#000000").setStrokeStyle(1).drawRoundRect(0, 0, 300, 200, 5).endFill().endStroke();
                  
                    var titleContainer = new createjs.Container();
                    titleContainer.x = 0;
                    titleContainer.y = 0;
                    var titleText = new createjs.Text("CORRECT", "bold 36px Arial", "#000");
                    titleText.x = 150;
                    titleText.y = 5;
                    titleText.textAlign = "center";
                    var titleBackground = new createjs.Shape();
                    titleBackground.graphics.beginFill("#00FF00").beginStroke("#00FF00").setStrokeStyle(1).drawRoundRect(0, 0, 300, 50, 5).endFill().endStroke();
                    titleContainer.addChild(titleBackground, titleText);

                    var nextContainer = new createjs.Container();
                    nextContainer.x = 90;
                    nextContainer.y = 60;
                    var nextText = new createjs.Text("NEXT", "bold 20px Arial", "#7449AE");
                    nextText.x = 60;
                    nextText.y = 5;
                    nextText.textAlign = "center";
                    var nextBackground = new createjs.Shape();
                    nextBackground.graphics.beginFill("black").beginStroke("#000").setStrokeStyle(1).drawRoundRect(0, 0, 120, 30, 5).endFill().endStroke();
                    nextContainer.addChild(nextBackground, nextText);

                    var CorrectAnswerLabel = new createjs.Text("The correct answer is:", "bold 16px Arial", "#000");
                    CorrectAnswerLabel.lineWidth = 200;
                    CorrectAnswerLabel.x = (300 - CorrectAnswerLabel.getBounds().width) / 2;
                    CorrectAnswerLabel.y = nextContainer.y + 40;
                    CorrectAnswerText = new createjs.Text(gameState.correctAnswer, "14px Arial", "#000");
                    CorrectAnswerText.lineWidth = 200;
                    CorrectAnswerText.x = (300 - CorrectAnswerText.getBounds().width) / 2;
                    CorrectAnswerText.y = nextContainer.y + 60;

                    var feedback = new createjs.Container();
                    feedback.x = 0;
                    feedback.y = 150;
                    var feedbackBG = new createjs.Shape();
                    feedbackBG.graphics.beginFill("#CCCCCC").setStrokeStyle(1).drawRoundRect(0, 0, 300, 50, 5).endFill();
                    feedback.addChild(feedbackBG);

                    if (gameState.feedback) {
                        var feedbackText = new createjs.Text(gameState.feedback, "14px Arial italic", "#000");
                        feedbackText.lineWidth = 200;
                        feedbackText.x = 150;
                        feedbackText.y = 10;
                        feedbackText.textAlign = "center";
                        feedback.addChild(feedbackText);
                    }


                    nextContainer.addEventListener("click", function () {
                        mainView.removeAllChildren();
                        createHelpline();
                        showNextQuestion()
                    });

                    container.addChild(containerBG, feedback, titleContainer, nextContainer, CorrectAnswerText, CorrectAnswerLabel);
                    return container;
                }

                ///////////////////////////////////Ask the audience////////////////////////////////////////////////////////
                function createAskAudienceHelpLine() {
                    var askAudienceContainer = new createjs.Container();
                    var askAudienceCircle = new createjs.Shape();


                    if (isAskAudienceUsed) {
                        var askAudienceText1 = new createjs.Text("ask", "14px Arial", "#ccc");
                        var askAudienceText2 = new createjs.Text("audience", "14px Arial", "#ccc");
                        askAudienceCircle.graphics.beginFill("#666").beginStroke("#666").setStrokeStyle(1).drawEllipse(0, 0, 70, 40).endFill().endStroke();

                    } else {
                        var askAudienceText1 = new createjs.Text("ask", "14px Arial", "white");
                        var askAudienceText2 = new createjs.Text("audience", "14px Arial", "white");
                        askAudienceCircle.graphics.beginFill("#000").beginStroke("#000").setStrokeStyle(1).drawEllipse(0, 0, 70, 40).endFill().endStroke();

                    }

                    //askAudienceContainer.shadow = new createjs.Shadow("#7449AE", 3, 3, 10);
                    askAudienceContainer.addChild(askAudienceCircle);
                    askAudienceText1.y = 2;
                    askAudienceText1.x = 25;
                    askAudienceText2.y = 14;
                    askAudienceText2.x = 6;
                    askAudienceContainer.addChild(askAudienceText1);
                    askAudienceContainer.addChild(askAudienceText2);

                    askAudienceContainer.x = 650;
                    askAudienceContainer.y = 520;
                    if (!isAskAudienceUsed) {

                        askAudienceContainer.addEventListener("click", askAudienceHelplineClick);

                    }
                    return askAudienceContainer;
                }
                function closeAskAudienceSection() {
                    mainView.removeAllChildren();
                    currentArea = getDisplayQuestionArea();
                    createHelpline();
                    mainView.addChild(currentArea);
                    stage.update();
                }
                function askAudienceHelplineClick() {
                    if (isClickEnabled) {
                        isAskAudienceWindowOpen = true;
                        createjs.Sound.play("activateHelp", { volume: .75 });

                        var container = new createjs.Container();

                        container.x = 30;
                        container.y = 30;
                        var abc = ['A', 'B', 'C', 'D'];
                        var askContainer = new createjs.Container();
                        var askBox = new createjs.Shape();

                        askBox.graphics.beginFill("#000").beginStroke("#000").setStrokeStyle(1).drawRoundRect(180, 150, 290, 200, 5).endFill().endStroke();
                        //askBox.shadow = new createjs.Shadow("#7449AE", 3, 3, 10);
                        askContainer.addChild(askBox);
                        for (var i = 0; i < gameData.Questions[questionIndex].Answers.length; ++i) {

                            //var containerResult = new createjs.Shape();
                            var containerFill = new createjs.Shape();

                            //containerResult.graphics.beginStroke("#fff").setStrokeStyle(1).drawRoundRect((100 * i), 9, 10, 30, 5).endStroke();
                            //containerResult.shadow = new createjs.Shadow("#7449AE", 3, 3, 10);

                            var fillAmount = (Math.random() * (100 - 0) + 0);

                            if (gameData.Questions[questionIndex].Answers[i].IsCorrect) {
                                containerFill.graphics.beginFill("#fff").beginStroke("#fff").setStrokeStyle(1).drawRoundRect((50 * i), 200, 10, 110, 5).endFill().endStroke();
                                //containerFill.shadow = new createjs.Shadow("#7449AE", 3, 3, 10);
                                var containerText = new createjs.Text(abc[i], "14px Arial", "#ccc");

                            } else {
                                containerFill.graphics.beginFill("#fff").beginStroke("#fff").setStrokeStyle(1).drawRoundRect((50 * i), (310 - fillAmount), 10, fillAmount, 5).endFill().endStroke();
                                //containerFill.shadow = new createjs.Shadow("#7449AE", 3, 3, 10);
                                var containerText = new createjs.Text(abc[i], "14px Arial", "#ccc");
                            }

                            //containerResult.x = 250;
                            containerFill.x = 250;
                            containerText.x = (250 + (50 * i));
                            containerText.y = 170;
                            //askContainer.addChild(containerResult);
                            askContainer.addChild(containerFill);
                            askContainer.addChild(containerText);
                        }
                        isAskAudienceUsed = true;
                        currentArea = getDisplayQuestionArea();
                        createHelpline();
                        mainView.addChild(askContainer);
                        isAskAudienceWindowOpen = true;
                        stage.update();

                    }
                }
                ///////////////////////////////////////////////////////75:25//////////////////////////////////////////////////
                function seventyFiveHelplineClick() {
                    if (isClickEnabled) {
                        createjs.Sound.play("activateHelp", { volume: .75 });
                        arrayLength = gameData.Questions[questionIndex].Answers.length;
                        i = 0;
                        while (gameData.Questions[questionIndex].Answers.length > 1) {

                            if (gameData.Questions[questionIndex].Answers[i].IsCorrect == false) {
                                var helpline = gameData.Questions[questionIndex].Answers
                                helpline.splice(i, 1);
                                //  gameData.Questions[questionIndex].Answers.splice(i, 1);
                            }
                            ++i;
                            if (i == 4) {
                                i = 0;
                            } else if (i > (gameData.Questions[questionIndex].Answers.length - 1)) {
                                i = 0;

                            }
                        }
                        isSeventyFivePercentUsed = true;

                        mainView.removeAllChildren();
                        currentArea = getDisplayQuestionArea();
                        createHelpline();
                        create5050.visible = false;
                        mainView.addChild(currentArea);
                        stage.update();

                    }
                }
                function createSeventyFivePercentHelpLine() {
                    var seventyFivePercentContainer = new createjs.Container();
                    var seventyFivePercentCircle = new createjs.Shape();


                    if (isSeventyFivePercentUsed) {
                        var seventyFivePercentText = new createjs.Text("75:25", "16px Arial bold", "#ccc");
                        seventyFivePercentCircle.graphics.beginFill("#666").beginStroke("#666").setStrokeStyle(1).drawEllipse(0, 0, 70, 40).endFill().endStroke();

                    } else {
                        var seventyFivePercentText = new createjs.Text("75:25", "16px Arial bold", "white");
                        seventyFivePercentCircle.graphics.beginFill("#000").beginStroke("#000").setStrokeStyle(1).drawEllipse(0, 0, 70, 40).endFill().endStroke();

                    }

                    //seventyFivePercentContainer.shadow = new createjs.Shadow("#7449AE", 3, 3, 10);
                    seventyFivePercentContainer.addChild(seventyFivePercentCircle);
                    seventyFivePercentText.y = 12;
                    seventyFivePercentText.x = 14;
                    seventyFivePercentContainer.addChild(seventyFivePercentText);
                    seventyFivePercentContainer.x = 650;
                    seventyFivePercentContainer.y = 460;
                    if (!isSeventyFivePercentUsed) {
                        seventyFivePercentContainer.addEventListener("click", seventyFiveHelplineClick);

                    }

                    return seventyFivePercentContainer;
                }
                ///////////////////////////////////////////////////////50:50//////////////////////////////////////////////////
                function fiftyFiftyHelplineClick() {
                    if (isClickEnabled) {
                        createjs.Sound.play("activateHelp", { volume: .75 });
                        var data = gameData.Questions[questionIndex].Answers; //
                        half = Math.floor(data.length / 2);
                        while (data.length > half) {
                            var ri = Math.floor(Math.random() * data.length);
                            if ((data[ri].IsCorrect == false) && (data.length > half)) {
                                data.splice(ri, 1);

                                //    }

                                ////original
                                //half = Math.floor(gameData.Questions[questionIndex].Answers.length / 2);

                                //while (gameData.Questions[questionIndex].Answers.length > half) {
                                //var ri = Math.floor(Math.random() * gameData.Questions[questionIndex].Answers.length);

                                //if ((gameData.Questions[questionIndex].Answers[ri].IsCorrect == false) && (gameData.Questions[questionIndex].Answers.length > half)) {
                                //    gameData.Questions[questionIndex].Answers.splice(ri, 1);

                            }
                        }

                        isFiftyPercentUsed = true;

                        mainView.removeAllChildren();
                        currentArea = getDisplayQuestionArea();
                        createHelpline();
                        mainView.addChild(currentArea);
                        stage.update();

                    }
                }
                function createFiftyPercentHelpLine() {
                    var fiftyFiftyContainer = new createjs.Container();
                    var fiftyFiftyCircle = new createjs.Shape();


                    if (isFiftyPercentUsed) {
                        var fiftyFiftyText = new createjs.Text("50:50", "16px Arial bold", "#ccc");
                        fiftyFiftyCircle.graphics.beginFill("#666").beginStroke("#666").setStrokeStyle(1).drawEllipse(0, 0, 70, 40).endFill().endStroke();

                    } else {
                        var fiftyFiftyText = new createjs.Text("50:50", "16px Arial bold", "white");
                        fiftyFiftyCircle.graphics.beginFill("#000").beginStroke("#000").setStrokeStyle(1).drawEllipse(0, 0, 70, 40).endFill().endStroke();

                    }

                    //fiftyFiftyContainer.shadow = new createjs.Shadow("#7449AE", 3, 3, 10);
                    fiftyFiftyContainer.addChild(fiftyFiftyCircle);
                    fiftyFiftyText.y = 12;
                    fiftyFiftyText.x = 14;
                    fiftyFiftyContainer.addChild(fiftyFiftyText);
                    fiftyFiftyContainer.x = 650;
                    fiftyFiftyContainer.y = 400;
                    if (!isFiftyPercentUsed) {
                        fiftyFiftyContainer.addEventListener("click", fiftyFiftyHelplineClick);

                    }

                    return fiftyFiftyContainer;
                }

                function createHelpline() {
                    var createAsk = createAskAudienceHelpLine();
                    mainView.addChild(createAsk);


                    var create7525 = createSeventyFivePercentHelpLine();
                    mainView.addChild(create7525);


                    create5050 = createFiftyPercentHelpLine();

                    mainView.addChild(create5050);
                }

                createHelpline();
                ///startover
                function startOver() {

                    gameData = $.extend(true, {}, originalGameData);
                    gameData.Awards = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000];
                    showView(createTitleView());
                }

                var quit;

                if (isLmsConnected) {
                    quit = function () {
                        ScormHelper.adl.nav.request("exitAll");
                        ScormHelper.terminate();
                    }
                }
                else {
                    quit = function () {
                        window.location = "http://www.wisc-online.com";
                    }
                }
                $(window).bind('beforeunload', function () {
                    var points = (gameData.Awards == null || gameData.Awards[AwardIndex - 1] == undefined) ? 0 : gameData.Awards[AwardIndex - 1];
                    if (points > 0)
                        submitScore(points)
                })


                function submitScore(score) {
                    if (gameState.submitedScore)
                        return false;
                    gameState.submitedScore = true;


                    var url = gameData.leaderboardUrl;
                    if (url) {
                        var data = {
                            gameId: gameData.id,
                            score: score
                        };
                        $.ajax(url, {
                            type: "POST",
                            data: data,
                            success: function (x) {

                            },
                            error: function (x, y, z) {

                            }
                        });
                    }
                }

                function createWinnerView() {
                    var view = new createjs.Container();
                    var width = stage.canvas.width;
                    var image = new createjs.Bitmap(queue.getResult("winner_screen_image"))
                    b = image.getBounds();

                    createjs.Sound.play("gameFinished", { volume: 0.75});

                    image.x = (width - b.width) / 2;
                    image.y = 100;
                    var points = (gameData.Awards == null || gameData.Awards[AwardIndex - 1] == undefined) ? 0 : gameData.Awards[AwardIndex - 1];
                    if (points == 0) {
                        var titleText = new createjs.Text("You didn't win any points.  Try again!", "bold 40px Arial");
                    } else {
                        var titleText = new createjs.Text("You won " + points + "!", "bold 40px Arial");
                        submitScore(points);
                    }

                    b = titleText.getBounds();
                    titleText.x = (width - b.width) / 2;
                    titleText.y = 30;

                    if (isLmsConnected) {
                        ScormHelper.cmi.score.raw(points)
                        ScormHelper.cmi.completionStatus(ScormHelper.completionStatus.completed);
                        ScormHelper.cmi.successStatus("passed");
                    }

                    var startOverButton = new createjs.Container();
                    startOverButton.hitArea = new createjs.Shape(new createjs.Graphics().beginFill("#f00").drawRect(0, 0, 200, 35));
                    startOverButton.x = (stage.canvas.width / 2) - 100;
                    startOverButton.y = 425;
                    startOverButton.cursor = 'pointer';
                    startOverButton.addChild(new createjs.Shape(new createjs.Graphics().setStrokeStyle(1).beginStroke("dark gray").beginFill("#7449AE").drawRoundRect(0, 0, 200, 35, 5).endFill()));
                    //startOverButton.shadow = new createjs.Shadow("gray", 3, 3, 5);

                    var startOverText = new createjs.Text("Start Over", "20pt Arial", "white");
                    startOverText.textAlign = "center";
                    startOverText.textBaseline = "middle";
                    startOverText.x = 100;
                    startOverText.y = 17.5;
                    //startOverText.shadow = new createjs.Shadow("gray", 1, 1, 3);
                    startOverButton.addChild(startOverText)

                    var hit = new createjs.Shape();

                    //  startOverButton.addEventListener("click", startOver);

                    startOverButton.addEventListener("click", function (event) {
                        clickSound.play();
                        startOver();
                    });
                    if (!isLmsConnected) {
                        view.addChild(startOverButton);
                    }
                    mainView.removeAllChildren();
                    view.addChild(titleText, image);

                    // only show the quit text if we're on a mobile device (or in SCORM player)!
                    if (isLmsConnected || navigator.userAgent.match(/Android/i)
                    || navigator.userAgent.match(/webOS/i)
                    || navigator.userAgent.match(/iPhone/i)
                    || navigator.userAgent.match(/iPad/i)
                    || navigator.userAgent.match(/iPod/i)
                    || navigator.userAgent.match(/BlackBerry/i)
                    || navigator.userAgent.match(/Windows Phone/i)
                    ) {
                        var quitButton = new createjs.Container();
                        quitButton.hitArea = new createjs.Shape(new createjs.Graphics().beginFill("#f00").drawRect(0, 0, 200, 35));
                        quitButton.x = startOverButton.x;
                        quitButton.y = startOverButton.y + 50;
                        quitButton.cursor = 'pointer';
                        quitButton.addChild(new createjs.Shape(new createjs.Graphics().setStrokeStyle(1).beginStroke("dark gray").beginFill("#7449AE").drawRoundRect(0, 0, 200, 35, 5).endFill()));
                        //quitButton.shadow = new createjs.Shadow("gray", 3, 3, 5);

                        var quitText = new createjs.Text("Quit", "20pt Arial", "white");
                        quitText.textAlign = "center";
                        quitText.textBaseline = "middle";
                        quitText.x = 100;
                        quitText.y = 17.5;
                        //quitText.shadow = new createjs.Shadow("gray", 1, 1, 3);
                        quitButton.addChild(quitText)

                        quitButton.addEventListener("click", quit);

                        view.addChild(quitButton);
                    }

                    isLmsConnected = false;

                    return view;
                }

                mainView.addChild(currentArea);
                mainView.y = 20;

                var instructionsContainer = new createjs.Container();
                instructionsContainer.x = 0;
                instructionsContainer.y = 530;
                instructionsContainer.hitArea = new createjs.Shape(new createjs.Graphics().beginFill("#F00").drawCircle(0, 50, 50));
                instructionsContainer.cursor = 'pointer';

                instructionsContainer.addChild(new createjs.Bitmap(queue.getResult("instructions_background")));

                var questionMark = new createjs.Bitmap(queue.getResult("instructions_question"));
                //questionMark.regX = 25;
                //questionMark.regY = 25;

                instructionsContainer.addChild(questionMark);


                var soundContainer = new createjs.Container();
                soundContainer.x = 750;
                soundContainer.y = 580;
                soundContainer.name = "theSoundContainer";
                soundContainer.cursor = 'pointer';
                soundContainer.hitArea = new createjs.Shape(new createjs.Graphics().beginFill("#F00").drawCircle(0, -50, 50));
                var bg = new createjs.Bitmap(queue.getResult("instructions_background"));
                bg.rotation = 270;
                bg.x = 0;
                bg.y = 0;
                soundContainer.addChild(bg);
                var sound = new createjs.Bitmap(queue.getResult("musicOn"));
                sound.name = "musicOnImage"
                sound.scaleX = .75;
                sound.scaleY = .75;
                sound.rotation = 180;
                sound.x = 50;
                soundContainer.addChild(sound);
                soundContainer.addEventListener("click", function (evt) {
                    if (musicOn == true) {

                        musicOn = false;
                        var sound = new createjs.Bitmap(queue.getResult("musicOff"));
                        sound.scaleX = .75;
                        sound.scaleY = .75;
                        sound.rotation = 180;
                        sound.x = 50;
                        sound.name = "musicOffImage"
                        var destroy = evt.currentTarget.getChildByName("musicOnImage");
                        evt.currentTarget.removeChild(destroy);
                        evt.currentTarget.addChild(sound);
                        createjs.Sound.setMute(true);

                    } else {
                        musicOn = true;
                        var sound = new createjs.Bitmap(queue.getResult("musicOn"));
                        sound.scaleX = .75;
                        sound.scaleY = .75;
                        sound.rotation = 180;
                        sound.x = 50;
                        sound.name = "musicOnImage"
                        var destroy = evt.currentTarget.getChildByName("musicOffImage");
                        evt.currentTarget.removeChild(destroy);
                        evt.currentTarget.addChild(sound);
                        createjs.Sound.setMute(false);

                    }

                });


                mainView.addChild(instructionsContainer, soundContainer);

                instructionsContainer.addEventListener("click", function () {
                    showView(getInstructionsView());
                });

                function handleInstructionsMouseOver(event) {
                    if (event.type == "mouseover") {
                        createjs.Tween.get(questionMark, { loop: false }).to({ scaleX: 1.0625, scaleY: 1.0625 }, 50);
                    }
                    else {
                        createjs.Tween.get(questionMark, { loop: false }).to({ scaleX: 1.0, scaleY: 1.0 }, 50);
                    }
                }

                instructionsContainer.on("mouseover", handleInstructionsMouseOver);
                instructionsContainer.on("mouseout", handleInstructionsMouseOver);

                return mainView;
            }

            var create5050;
            var isClickEnabled = true;

            function createInstructionsView() {
                var view = new createjs.Container();
                var image = new createjs.Bitmap(queue.getResult("instructions"));

                var hit = new createjs.Shape();
                var exitContainer = new createjs.Container();
                var exitBox = new createjs.Shape();

                exitContainer.x = 720;
                exitContainer.y = 570;
                var exitText = new createjs.Text("BACK", 'bold 18px Arial', "#fff");
                exitText.x = 8;
                exitText.y = 8;
                exitContainer.hitArea = new createjs.Shape(new createjs.Graphics().beginFill("#7449AE").beginStroke("#000").setStrokeStyle(1).drawRoundRect(0, 0, 70, 37, 5).endFill().endStroke());
                hit.graphics.beginFill("#000").drawRect(0, 0, exitText.getMeasuredWidth(), exitText.getMeasuredHeight());
                exitBox.graphics.beginFill("#7449AE").beginStroke("#000").setStrokeStyle(1).drawRoundRect(0, 0, 70, 37, 5).endFill().endStroke();
                exitText.hitArea = hit;
                exitContainer.addChild(exitBox, exitText);

                view.addChild(image, exitContainer); 

                exitContainer.addEventListener("click", function (event) {
                    showView(self.previousView);
                });

                return view;
            }
            var instructionsView = null;
            function getInstructionsView() {
                if (instructionsView == null) {
                    instructionsView = createInstructionsView();
                }
                return instructionsView;
            }

            self.previousView = null;
            self.currentView = null;
            function showView(view) {

                // TODO: add transition animation (fade)

                if (self.currentView) {
                    stage.removeChild(self.currentView);
                    self.previousView = self.currentView;
                }
                else {
                    self.previousView = null;
                }

                if (view) {
                    stage.addChild(view);
                    self.currentView = view;
                }
                else {
                    self.currentView = null;
                }

                stage.update();
            };


            
            showView(createTitleView());
            createjs.Ticker.addEventListener("tick", stage);

        }


    };

    return Game;
})(createjs, $);



