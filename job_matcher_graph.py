
from typing_extensions import TypedDict
from langchain_core.runnables.config import RunnableConfig
from langgraph.graph import StateGraph, START, END
from langchain_ollama import ChatOllama

from enum import Enum
#from langchain.output_parsers import EnumOutputParser
from langchain_classic.output_parsers.enum import EnumOutputParser
from langchain_core.messages import HumanMessage

class IsSuitableJobEnum(Enum):
    YES = "YES"
    NO = "NO"

class JobApplicationState(TypedDict):
    job_description: str
    is_suitable: IsSuitableJobEnum
    application: str
    current_role: str

class JobMatcherGraph:
    def __init__(self):
        print("Initializing JobMatcherGraph...")
        self.llm = ChatOllama(
            model="glm-4.7-flash:q4_K_M",
            temperature=0,
        )

        self.prompt_template_role_jd = (
            "Given a job description, decide whether it suites the Current Role."
            "\nCURRENT ROLE:\n{current_role}\n"
            "\nJOB DESCRIPTION:\n{job_description}\n\nAnswer only YES or NO."
        )

        self.parser = EnumOutputParser(enum=IsSuitableJobEnum)

        self.analyze_chain = self.llm | self.parser

        self.builder = StateGraph(JobApplicationState)
        self.builder.add_node("analyze_job_description", self.analyze_job_description)
        self.builder.add_node("generate_application", self.generate_application)
        self.builder.add_edge(START, "analyze_job_description")
        self.builder.add_conditional_edges(
            "analyze_job_description", self.is_suitable_condition,
             {True: "generate_application", False: END})
        self.builder.add_edge("generate_application", END)

        self.graph = self.builder.compile()



    def analyze_job_description(self,state):
        job_description = state["job_description"]
        current_role = state["current_role"] 
        prompt = self.prompt_template_role_jd.format(job_description=job_description, current_role=current_role)
        result = self.analyze_chain.invoke(prompt)
        return {"is_suitable": result}


    def is_suitable_condition(self,state: JobApplicationState):
        return state["is_suitable"] == IsSuitableJobEnum.YES


    def generate_application(self,state):
        print("...generating application...")
        return {"application": "some_fake_application", "actions": ["action2"]}


