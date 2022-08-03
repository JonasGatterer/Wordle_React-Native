import {allwords} from './allwords';
import {answers} from './answers';
import React, {useState, useEffect} from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, View, StyleSheet, Button, Switch, TextInput, Pressable, SafeAreaView, ScrollView} from 'react-native';
import Constants from 'expo-constants';
import { Card } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

//Game logic
interface AllGuesses{
  [key:number]: string
}

interface Stats{
  numOfGames: number;
  numOfTries: number;
  numOfWins: number;
  numOfLosses: number
}

const guessArray:string[] = ["", "", "", "", "", ""]

const guessBoardRow:string[] = ["", "", "", "", ""]

const keyBoard:string[][] = [
  ["Q", "W", "E", "R", "T", "Z", "U", "I", "O", "P",],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Y", "X", "C", "V", "B", "N", "M"]
]

const startBoard:AllGuesses = {
  0:"", 1:"", 2:"",3:"", 4:"", 5:""
}

const stats:Stats = {
  numOfGames: 0,
  numOfTries: 0,
  numOfWins: 0,
  numOfLosses: 0
}

const checkKeyBoard = (currentRow:number, guess:AllGuesses, toGuess:string, letter:string):number =>{
  if(currentRow>0){
    for(let i = 0; i<currentRow; i++){
      const guessWord:string = guess[i]
      const splittedGuess:string[] = guessWord.split("")
      const splittedToGuess:string[] = toGuess.split("")

      if(splittedGuess.some((char:string) => (char===letter))){
        if(splittedToGuess.some((char:string) => (char === letter))){
          return 1
        }else{
          return 2
        }
      } 
    }
  }
  return 0
}

const applyKeyStyle = (changeColor:number):any => {
  if(changeColor === 1){
    return styles.correctKey
  }else if(changeColor === 2){
    return styles.incorrectKey
  }
  return styles.pressable
}

const compareGuess = (guess:string, toGuessWord:string) => {
  for(let i = 0; i<5; i++){
    if(guess === toGuessWord[i]){
      return true
    }
  }
  return false
}

const applyBoxStyle = (rowNum:number, currentRow:number, guess:string, toGuess:string, anyLetter:boolean):any => {
  if(rowNum === currentRow || currentRow>rowNum){
    if(guess === toGuess){
      return styles.correctGuess
    }else if(anyLetter===true){
      return styles.almostCorrectGuess
    }else{
      return styles.normalGuess
    }
  }
}

const checkWrongWord = (currentRow:number, rowNum:number, wrongWord:boolean, prevBoxStyle:any):any => {
  if(currentRow === rowNum -1){
    if(wrongWord===true){
      return styles.notInList
    }
  }
  return prevBoxStyle
}



//React Native Components
const KeyBoardButton = ({letter, onButtonPressed, guess, toGuess, currentRow}:{letter:string, onButtonPressed:(letter:string) => void, guess:AllGuesses, toGuess:string, currentRow:number}) => {
  let pressable:any = styles.pressable
  let pressableText:any = styles.pressableText

  // 0 => color of Button will not change; 1 => color of Button will be changed to green; 2 => color of Button will be changed to red
  let changeColor:number = 0

  changeColor=checkKeyBoard(currentRow, guess, toGuess, letter)

  pressable=applyKeyStyle(changeColor)

  return(
    <View>
      <Pressable style={pressable} onPress={() => (onButtonPressed(letter))}>
        <Text style={pressableText}>{letter}</Text>
      </Pressable>
    </View>
  )
}


const EnterAndDeleteButton = ({onButtonPressed}:{onButtonPressed:(key:string) => void}) => {

  return(
    <View style={styles.boardRow}>
      <View style={styles.boardKey}>
        <Pressable style={styles.pressable} onPress={() => (onButtonPressed("Enter"))}>
          <Text style={styles.pressableText}>{"Enter"}</Text>
        </Pressable>
      </View>
      <View style={styles.boardKey}>
        <Pressable style={styles.pressable} onPress={() => (onButtonPressed("Delete"))}>
          <Text style={styles.pressableText}>{"Delete"}</Text>
        </Pressable>
      </View>
    </View>
  )
}


const KeyBoard = ({onButtonPressed, guess, toGuess, currentRow}:{onButtonPressed:(key:string) => void, guess:AllGuesses, toGuess:string, currentRow:number}) => {
  
  return(
    <View>
      {keyBoard.map((keyRow) => (
        <View style={styles.boardRow}>
          {keyRow.map((key) => (
            <View style={styles.boardKey}>
              <KeyBoardButton letter={key} onButtonPressed={onButtonPressed} guess={guess} toGuess={toGuess} currentRow={currentRow}/>
            </View>
          ))}
        </View>
      ))}
      <EnterAndDeleteButton onButtonPressed={onButtonPressed}/>
    </View>
  )
}


const Box = ({rowNum, currentRow, guess, toGuess, toGuessWord, wrongWord}:{rowNum:number, currentRow:number, guess: string, toGuess: string, toGuessWord:string, wrongWord:boolean}) => {
  let box:any = styles.guessBox
  let anyLetter:boolean = false

  anyLetter = compareGuess(guess, toGuessWord)
  
  box = applyBoxStyle(rowNum, currentRow, guess, toGuess, anyLetter)
  box = checkWrongWord(currentRow, rowNum, wrongWord, box)

  return(
    <View style={box}>
      <Text>
        {guess}
      </Text>
    </View>
  )
}


const GuessBoard = ({guess, toGuess, rowNum, currentRow, wrongWord}:{guess: string, toGuess:string, rowNum:number, currentRow:number, wrongWord: boolean}) => {
  const splittedGuess:string[] = guess.split("")
  const splittedToGuess:string[] = toGuess.split("")
  
  return(
    <View style={styles.guessRow}>
      {guessBoardRow.map((element, i) => (
        <View style={styles.guessBox}>
          <Box rowNum={rowNum} currentRow={currentRow} guess={splittedGuess[i]} toGuess={splittedToGuess[i]} toGuessWord={toGuess} wrongWord={wrongWord}/>
        </View>
      ))}
    </View>
  )
}


const DictonaryAPI = ({toGuess, currentRow}:{toGuess:string, currentRow:number}) => {
  const [clue, setClue] = useState<string>("")
  const [cluePressed, setCluePressed] = useState<boolean>(false)
  const [despClue, setDespClue] = useState<string>("")
  const [despCluePressed, setDespCluePressed] = useState<boolean>(false)

  const getWordFromDictionary = async () => {
    try{
      const resp = await fetch("https://api.dictionaryapi.dev/api/v2/entries/en/" + toGuess)
      const json = await resp.json()
      setClue("The type of the word is: " + json[0].meanings[0].partOfSpeech)
      setDespClue("Error: There does not exist an example for this word!")

      for(let i = 0; i < json[0].meanings.length; i++){
        const example:string = json[0].meanings[0].definitions[i].example
        let exampleArr:string[] = example.split(" ")
        for(let j = 0; j < exampleArr.length; j++){
          if(exampleArr[j] === toGuess.toLowerCase()){
            exampleArr[j] = "***"
            setDespClue("One example for the word is: " + exampleArr.join(" "))
            break;
          }else if(exampleArr[j] === (toGuess.toLowerCase() + ".")){
            exampleArr[j] = "***"
            break;
          }
        }
        setDespClue("One example for the word is: " + exampleArr.join(" "))
      }
    }
    catch (err){
      console.error(err)
    }
  }

  useEffect(() => {
      getWordFromDictionary();
  }, []);

  return(
    <View>
      <Pressable style={styles.normalButtons} onPress={(cluePressed) => setCluePressed(true)}>
        <Text style={styles.startViewButtonText}>Clue</Text>
      </Pressable>
      <Pressable style={styles.normalButtons} onPress={(despCluePressed) => setDespCluePressed(true)} disabled={currentRow < 5}>
        <Text style={styles.startViewButtonText}>Desperate Clue</Text>
      </Pressable>
      <Text>{cluePressed ? clue : ""}</Text>
      <Text>{despCluePressed ? despClue : ""}</Text>
    </View>
  )
}


const GameView = ({navigation, route}) => {
  const [guess, setGuess] = useState<AllGuesses>(startBoard)
  const [currentRow, setCurrentGuess] = useState<number>(0)
  const [wrongWord, setWrongWord] = useState<boolean>(false)
  const [resp, setResp] = useState<string>("")

  const random = ():string => {
    if(route.params.inputType === true){
      return answers[(parseInt(route.params.num))-1]
    }else{
      const random:number = Math.floor(Math.random() * 2316)
      return answers[random]
    }
  }

  const [toGuess] = useState<string>(random())

  const getWordFromAPI = async () => {
    try{
      const resp = await fetch("https://api.dictionaryapi.dev/api/v2/entries/en/" + toGuess)
      const json = await resp.json()
      setResp("Definition of " + toGuess + ": " + json[0].meanings[0].definitions[0].definition)
    }
    catch (err){
      alert(err)
      console.error(err)
    }
  }

  useEffect(() => {
      getWordFromAPI();
  }, []);

  const increaseTries = async (kind:string) => {
    try{
      if(kind === "win"){
        route.params.stat.numOfWins+=1
      }else if(kind === "lose"){
        route.params.stat.numOfLosses+=1
      }
      
      route.params.stat.numOfTries+=1
      const value = JSON.stringify(route.params.stat)
      await AsyncStorage.setItem('stats', value)
      
    }catch(err){
      console.log(err)
    }
  }

  const deleteGuess = (guessLetter:string) => {
    setGuess({...guess, [currentRow]: guessLetter.slice(0, -1)})
  }

  const compareArrays = (guessWord:string):boolean => {
    const previousGuess:string[] = guess[currentRow-1].split("")
    const currentWord:string[] = guessWord.split("")
    const wordToGuess:string[] = toGuess.split("")
    const rightGuesses:string[] = new Array

    for(let i = 0; i<5; i++){
      for(let j = 0; j<5; j++){
        if(previousGuess[i] === wordToGuess[j]){
          if(!rightGuesses.some((element:string) => element===previousGuess[i])){
            rightGuesses.push(previousGuess[i])
          }
        }
      }
    }
    
    for(let i = 0; i<5; i++){
      if(currentWord.some((element:string) => element===rightGuesses[i])){
        //
      }else if(rightGuesses[i] === undefined){
        //
      }else{
        return false
      }
    }

    return true
  }

  const validateHardMode = (guessWord:string):boolean => {
    if(currentRow===0){
      return true
    }else if(compareArrays(guessWord) === true){
      return true
    }
    return false
  }

  const validateGuess = (guessLetter:string) => {
    const anAnswer:boolean = allwords.some((words:string) => (words===guessLetter))

    if(guessLetter.length < 5){
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      alert("A valid guess needs 5 letters!")
      return null
    }else if(anAnswer === false){
      setWrongWord((wrongWord) => (!wrongWord))
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      alert("This is not a valid word!")
      return null
    }else if(toGuess === guessLetter){
      increaseTries("win")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      alert("Congratulation, you successfully guessed the word! " + resp)
      navigation.goBack()
      return null
    }else if(currentRow < 5){
      if(wrongWord === true){
        setWrongWord((wrongWord) => (!wrongWord))
      }

      if(route.params.gameMode === true){
        if(validateHardMode(guessLetter)===true){
          increaseTries("")
          setCurrentGuess(currentRow+1)
          return null
        }else{
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
          alert("This is hard mode, so all green and yellow from the preceding guess must be used in the new guess!")
          return null
        }
      }

      increaseTries("")
      setCurrentGuess(currentRow+1)
    }else{
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      increaseTries("lose")
      alert("Your 6 tries are over. The word would have been: " + toGuess + ". " + resp)
      navigation.goBack()
    }
  }

  const buttonHandler = (newGuess:string) => {
    const guessLetter:string = guess[currentRow]

    if(newGuess === "Delete"){
      deleteGuess(guessLetter)
      return null
    }else if(newGuess === "Enter"){
      validateGuess(guessLetter)
      return null
    }else if(guessLetter.length === 5){
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      alert("You cannot enter more than five characters!")
      return null
    }
    setGuess({...guess, [currentRow]: guessLetter+newGuess})
  }

  return(
    <View>
      <SafeAreaView>
        <ScrollView>
          <View style={styles.guessBoard}>
            {guessArray.map((element, index) => (
              <GuessBoard guess={guess[index]} toGuess={toGuess} rowNum={index+1} currentRow={currentRow} wrongWord={wrongWord}/>
            ))}
          </View>
          <KeyBoard onButtonPressed={buttonHandler} guess={guess} toGuess={toGuess} currentRow={currentRow}/>
          <DictonaryAPI toGuess={toGuess} currentRow={currentRow}/>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}


const Statistics = ({navigation}) => {
  const [statist, setStatist] = useState<Stats>(stats)

  const readStat = async () => {
    try{
      const value = await AsyncStorage.getItem('stat')
      if(value !== null){
        setStatist(JSON.parse(value))
      }
    }catch(err){
      console.log(err)
    }
  }

  const reset = async () => {
    try{
      await AsyncStorage.removeItem('statist')
      statist.numOfGames=0
      statist.numOfTries=0
      statist.numOfWins=0
      statist.numOfLosses=0
      navigation.goBack()
    }catch(err){
      console.log(err)
    }
  }

  useEffect(() => {
    readStat()
  }, [])

  return(
    <View style={styles.paragraph}>
      <Text style={styles.paragraphText}>Number of played games: {statist.numOfGames}</Text>
      <Text style={styles.paragraphText}>Number of wins: {statist.numOfWins}</Text>
      <Text style={styles.paragraphText}>Number of losses: {statist.numOfLosses}</Text>
      <Text style={styles.paragraphText}>Overall number of attempts: {statist.numOfTries}</Text>
      <Text style={styles.paragraphText}>Average attempts per game: {(statist.numOfTries/statist.numOfGames)}</Text>
      <Pressable onPress={() => reset()} style={styles.normalButtons}>
        <Text style={styles.startViewButtonText}>Reset Statistics</Text>
      </Pressable>
    </View>
  )
}


const StartView = ({navigation, route}) => {
  const [mode, setMode] = useState<boolean>(false)
  const [numIn, setNumIn] = useState<boolean>(false)
  const [input, setInput] = useState<string>("")
  const [stat, setStat] = useState<Stats>(stats)

  const checkNumInput = (str:string):boolean => {
    const num:number = parseInt(str)
    if((num>0 && num<2316 || numIn===false)){
      return false
    }else{
      return true
    }
  }

  const increaseStats = async () => {
    try{
      stat.numOfGames+=1
      const value = JSON.stringify(stat)
      await AsyncStorage.setItem('stats', value)
      
    }catch(err){
      console.log(err)
    }
  }

  const pressedStart = () => {
    increaseStats()
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    navigation.navigate("Game", {gameMode:mode, inputType:numIn, num:input, stat:stat})
  }

  return(
    <View>
      <Pressable style={checkNumInput(input)?styles.disableButton:styles.startViewButtons} onPress={() => pressedStart()} disabled={checkNumInput(input)}>
        <Text style={styles.startViewButtonText}>Start the game</Text>
      </Pressable>
      <Pressable style={styles.startViewButtons} onPress={() => navigation.navigate("Statistics")}>
        <Text style={styles.startViewButtonText}>Statistics</Text>
      </Pressable>

      <View style={styles.paragraph}>
        <Text style={styles.paragraphHeader}>Current settings:</Text>
        <Text style={styles.paragraphText}>{mode ? "Hard" : "Easy"} mode</Text>
        <Text style={styles.paragraphText}>{numIn ? "Word from answers list" : "Random word"}</Text>
      </View>

      <View style={styles.paragraph}>
        <Text style={styles.paragraphHeader}>Change settings:</Text>
        <Text style={styles.paragraphText}>Hard mode:</Text>
        <View style={styles.firstSetting}>
          <Switch value={mode} onValueChange={(bool) => setMode(bool)}/>
        </View>
        <Text style={styles.paragraphText}>Select a word from answers list:</Text>
        <View style={styles.secondSetting}>
          <Switch style={styles.wordSelectSwitch} value={numIn} onValueChange={bool => setNumIn(bool)}/>
          <TextInput style={styles.inputField} keyboardType={"numeric"} value={input} onChangeText={num => setInput(num)} editable={numIn} maxLength={4}/>
        </View>
      </View>
    </View>
  )
}


const StackNavigator = () => {
  const Stack = createStackNavigator()

  return(
    <Stack.Navigator>
      <Stack.Screen name="StartView" component={StartView} options={{title:"Wordle"}}/>
      <Stack.Screen name="Statistics" component={Statistics} options={{title: "Statistics"}}/>
      <Stack.Screen name="Game" component={GameView} options={{title:"Game"}}/>
    </Stack.Navigator>
  )
}


const App = () => {
  return(
    <View style={styles.container}>
      <NavigationContainer>
        <StackNavigator/>
      </NavigationContainer>
    </View>
  )
}
export default App


const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Constants.statusBarHeight,
    backgroundColor: '#ecf0f1',
    padding: 8,
  },
  startViewButtons:{
    backgroundColor: "mintcream",
    borderWidth: 2,
    borderRadius: 4,
    marginTop: 10,
    marginRight: 70,
    marginBottom: 5,
    marginLeft: 70,
    padding: 10,
  },
  startViewButtonText:{
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 15,
  },
  disableButton: {
    backgroundColor: "lightgrey",
    borderWidth: 2,
    borderRadius: 4,
    marginTop: 10,
    marginRight: 70,
    marginBottom: 5,
    marginLeft: 70,
    padding: 10,
  },
  paragraph: {
    paddingTop: 20,
    fontWeight: "bold",
    textAlign: 'center',
  },
  paragraphHeader: {
    fontWeight: "bold",
    fontSize: 20,
    paddingBottom:5,
  },
  paragraphText: {
    fontWeight: "bold",
    fontSize: 15,
    paddingBottom: 5,
  },
  firstSetting: {
    padding:5,
    alignItems:"center",
  },
  secondSetting: {
    padding:5,
    flexDirection: "row",
    display: "flex",
    justifyContent: "center",
  },
  inputField: {
    borderWidth: 1,
    backgroundColor: 'white',
    width:50,
  },
  wordSelectSwitch: {
    marginRight: 20,
  },
  boardRow: {
    flexDirection: "row",
    justifyContent: 'center',
    padding: 1,
  },
  boardKey: {
    padding: 1,
  },
  guessBoard: {
    height: 340,
  },
  guessRow: {
    flexDirection: "row",
    justifyContent: "center"
  },
  guessBox: {
    borderWidth: 1,
    borderColor: "white",
    flex: 1,
    margin: 2,
    aspectRatio: 1,
    maxWidth: 50,
    justifyContent:"center",
    alignItems: "center",
    backgroundColor:"white"
  },
  normalGuess: {
    borderWidth: 1,
    borderColor: "lightgrey",
    flex: 1,
    margin: 2,
    aspectRatio: 1,
    maxWidth: 50,
    justifyContent:"center",
    alignItems: "center",
    backgroundColor: "lightgrey",
  },
  correctGuess: {
    borderWidth: 1,
    borderColor: "lightgreen",
    flex: 1,
    margin: 2,
    aspectRatio: 1,
    maxWidth: 50,
    justifyContent:"center",
    alignItems: "center",
    backgroundColor: "lightgreen",
  },
  almostCorrectGuess:{
    borderWidth: 1,
    borderColor: "yellow",
    flex: 1,
    margin: 2,
    aspectRatio: 1,
    maxWidth: 50,
    justifyContent:"center",
    alignItems: "center",
    backgroundColor: "yellow",
  },
  notInList:{
    borderWidth: 1,
    borderColor: "red",
    flex: 1,
    margin: 2,
    aspectRatio: 1,
    maxWidth: 50,
    justifyContent:"center",
    alignItems: "center",
    backgroundColor: "red",
  },
  pressable:{
    padding: 4,
    borderWidth: 2,
    borderColor: "black",
    borderRadius: 4,
  },
  pressableText:{
    fontWeight: "bold",
    padding: 4,
  },
  correctKey: {
    padding: 4,
    borderWidth: 2,
    borderColor: "black",
    borderRadius: 4,
    backgroundColor: "lightgreen"
  },
  incorrectKey: {
    padding: 4,
    borderWidth: 2,
    borderColor: "black",
    borderRadius: 4,
    backgroundColor: "tomato"
  },
  normalButtons: {
    backgroundColor: "lightblue",
    borderWidth: 2,
    borderRadius: 2,
    marginTop: 10,
    marginRight: 70,
    marginBottom: 5,
    marginLeft: 70,
    padding: 10,
  }
});